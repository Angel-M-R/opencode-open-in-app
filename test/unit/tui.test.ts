import type { TuiPluginApi, TuiSlotPlugin } from "@opencode-ai/plugin/tui";
import { describe, expect, it, vi } from "vitest";

import type { App, AppId } from "../../src/apps.js";
import {
  createOpenInAppTui,
  SIDEBAR_CONTENT_SLOT_ORDER,
} from "../../src/tui.js";

vi.mock("@opentui/solid/jsx-runtime", () => {
  const jsx = (
    type: string | ((props: Record<string, unknown>) => unknown),
    props: Record<string, unknown> = {},
  ) => (typeof type === "function" ? type(props) : { type, props });
  return { jsx, jsxs: jsx, jsxDEV: jsx, Fragment: jsx };
});

vi.mock("@opentui/solid/jsx-dev-runtime", () => {
  const jsx = (
    type: string | ((props: Record<string, unknown>) => unknown),
    props: Record<string, unknown> = {},
  ) => (typeof type === "function" ? type(props) : { type, props });
  return { jsx, jsxs: jsx, jsxDEV: jsx, Fragment: jsx };
});

interface TestElement {
  readonly type: string;
  readonly props: Record<string, unknown> & {
    readonly children?: unknown;
    readonly onKeyDown?: (event: TestKeyEvent) => void;
  };
}

interface TestKeyEvent {
  readonly name: string;
  preventDefault(): void;
  stopPropagation(): void;
}

const apps = [
  { id: "vscode", name: "VS Code", command: "code", fixedArgs: ["--"] },
  { id: "cursor", name: "Cursor", command: "cursor", fixedArgs: ["--"] },
  {
    id: "explorer",
    name: "File Explorer",
    command: "open",
    fixedArgs: ["-a", "Finder", "--"],
  },
] as const satisfies readonly App[];

function createRuntime(
  storedFavourite?: AppId,
  projectPaths: { directory: unknown; worktree: unknown } = {
    directory: process.cwd(),
    worktree: process.cwd(),
  },
) {
  let slotPlugin: TuiSlotPlugin | undefined;
  let disposePlugin: (() => void) | undefined;
  let stored = storedFavourite;
  const favouriteStore = {
    get: vi.fn((detectedApps: readonly App[]) =>
      detectedApps.find((app) => app.id === stored),
    ),
    set: vi.fn((appId: AppId) => {
      stored = appId;
    }),
  };
  const dialogSelect = vi.fn((_props: unknown) => null);
  const launch = vi.fn(async (_app: App, _projectRoot: string) =>
    ({ success: true }) as const,
  );
  const api = {
    kv: {
      get: <Value,>(_key: string, fallback?: Value) => fallback as Value,
      set: vi.fn(),
      ready: true,
    },
    keymap: undefined,
    lifecycle: {
      signal: new AbortController().signal,
      onDispose: vi.fn((dispose: () => void) => {
        disposePlugin = dispose;
        return vi.fn();
      }),
    },
    slots: {
      register: vi.fn((plugin: TuiSlotPlugin) => {
        slotPlugin = plugin;
        return "open-in-app-slot";
      }),
    },
    state: {
      path: projectPaths,
    },
    ui: {
      toast: vi.fn(),
      dialog: {
        replace: vi.fn((renderDialog: () => unknown) => {
          renderDialog();
        }),
        clear: vi.fn(),
      },
      DialogSelect: dialogSelect,
    },
  } as unknown as TuiPluginApi;

  return {
    api,
    dialogSelect,
    favouriteStore,
    launch,
    getSlotPlugin: () => slotPlugin,
    dispose: () => disposePlugin?.(),
  };
}

function keyEvent(name = "return"): TestKeyEvent {
  return {
    name,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

function childElements(element: TestElement): TestElement[] {
  const children = element.props.children;
  return (Array.isArray(children) ? children : [children]) as TestElement[];
}

function textValue(element: TestElement): string {
  const child = element.props.children;
  return String(typeof child === "function" ? child() : child);
}

function controlCopy(control: TestElement): string {
  const [labelRegion, arrowRegion] = childElements(control);
  if (!labelRegion || !arrowRegion) throw new Error("control regions missing");
  const [labelText] = childElements(labelRegion);
  const [arrowText] = childElements(arrowRegion);
  if (!labelText || !arrowText) throw new Error("control text missing");
  return `${textValue(labelText)}${textValue(arrowText)}`;
}

function activate(region: TestElement): void {
  const onKeyDown = region.props.onKeyDown;
  if (!onKeyDown) throw new Error("activation handler missing");
  onKeyDown(keyEvent());
}

describe("sidebar open-in-app control", () => {
  it("registers one natural-width sidebar_content row and updates all exact copies reactively", async () => {
    const runtime = createRuntime();
    const plugin = createOpenInAppTui({
      catalog: { getDetectedApps: async () => apps },
      favouriteStore: runtime.favouriteStore,
      launch: runtime.launch,
    });
    await plugin.tui(
      runtime.api,
      undefined,
      {} as Parameters<typeof plugin.tui>[2],
    );

    expect(runtime.api.slots.register).toHaveBeenCalledOnce();
    const slotPlugin = runtime.getSlotPlugin();
    expect(slotPlugin?.order).toBe(SIDEBAR_CONTENT_SLOT_ORDER);
    expect(SIDEBAR_CONTENT_SLOT_ORDER).toBe(89);
    expect(Object.keys(slotPlugin?.slots ?? {})).toEqual(["sidebar_content"]);

    const renderSidebar = slotPlugin?.slots.sidebar_content;
    if (!renderSidebar) throw new Error("sidebar_content was not registered");
    const renderControl = () =>
      renderSidebar(
        { theme: { current: { textMuted: "#ffffff" } } } as unknown as Parameters<
          typeof renderSidebar
        >[0],
        { session_id: "session-1" },
      ) as TestElement;

    try {
      let control = renderControl();
      let [labelRegion, arrowRegion] = childElements(control);
      expect(controlCopy(control)).toBe("Open in ↓");
      expect(control.props.width).toBeUndefined();
      expect(control.props.flexGrow).toBeUndefined();
      expect(labelRegion?.props.width).toBeUndefined();
      expect(labelRegion?.props.flexGrow).toBeUndefined();
      expect(arrowRegion?.props.width).toBeUndefined();

      for (const [index, app] of apps.entries()) {
        runtime.dialogSelect.mockClear();
        if (index === 0) activate(labelRegion!);
        else activate(arrowRegion!);
        await vi.waitFor(() => expect(runtime.dialogSelect).toHaveBeenCalledOnce());

        const dialogProps = runtime.dialogSelect.mock.calls.at(-1)?.[0] as
          | {
              options: Array<{ value: App }>;
              onSelect(option: { value: App }): void;
            }
          | undefined;
        const option = dialogProps?.options[index];
        if (!dialogProps || !option) throw new Error("picker option missing");
        dialogProps.onSelect(option);

        control = renderControl();
        [labelRegion, arrowRegion] = childElements(control);
        expect(controlCopy(control)).toBe(`Open in ${app.name} ↓`);
      }

      runtime.launch.mockClear();
      runtime.dialogSelect.mockClear();
      activate(labelRegion!);
      expect(runtime.launch).toHaveBeenCalledWith(apps[2], process.cwd());
      expect(runtime.dialogSelect).not.toHaveBeenCalled();

      runtime.launch.mockClear();
      activate(arrowRegion!);
      await vi.waitFor(() => expect(runtime.dialogSelect).toHaveBeenCalledOnce());
      expect(runtime.launch).not.toHaveBeenCalled();
    } finally {
      runtime.dispose();
    }
  });

  it("shows only a persisted and detected favourite on startup", async () => {
    const runtime = createRuntime("vscode");
    const plugin = createOpenInAppTui({
      catalog: { getDetectedApps: async () => apps },
      favouriteStore: runtime.favouriteStore,
      launch: runtime.launch,
    });
    await plugin.tui(
      runtime.api,
      undefined,
      {} as Parameters<typeof plugin.tui>[2],
    );

    const renderSidebar = runtime.getSlotPlugin()?.slots.sidebar_content;
    if (!renderSidebar) throw new Error("sidebar_content was not registered");
    const renderControl = () =>
      renderSidebar(
        { theme: { current: { textMuted: "#ffffff" } } } as unknown as Parameters<
          typeof renderSidebar
        >[0],
        { session_id: "session-1" },
      ) as TestElement;

    try {
      await vi.waitFor(() => {
        expect(controlCopy(renderControl())).toBe("Open in VS Code ↓");
      });
    } finally {
      runtime.dispose();
    }
  });

  it("does not open the picker or launch when no valid project root exists", async () => {
    const runtime = createRuntime("vscode", {
      directory: "relative/project",
      worktree: "/definitely/not/an/existing/project",
    });
    vi.spyOn(process, "cwd").mockImplementation(() => {
      throw new Error("cwd unavailable");
    });
    const plugin = createOpenInAppTui({
      catalog: { getDetectedApps: async () => apps },
      favouriteStore: runtime.favouriteStore,
      launch: runtime.launch,
    });
    await plugin.tui(
      runtime.api,
      undefined,
      {} as Parameters<typeof plugin.tui>[2],
    );

    const renderSidebar = runtime.getSlotPlugin()?.slots.sidebar_content;
    if (!renderSidebar) throw new Error("sidebar_content was not registered");
    const control = renderSidebar(
      { theme: { current: { textMuted: "#ffffff" } } } as unknown as Parameters<
        typeof renderSidebar
      >[0],
      { session_id: "session-1" },
    ) as TestElement;
    const [labelRegion, arrowRegion] = childElements(control);

    try {
      activate(labelRegion!);
      activate(arrowRegion!);
      await Promise.resolve();
      expect(runtime.launch).not.toHaveBeenCalled();
      expect(runtime.dialogSelect).not.toHaveBeenCalled();
    } finally {
      runtime.dispose();
      vi.restoreAllMocks();
    }
  });
});
