import type { TuiPluginApi, TuiSlotPlugin } from "@opencode-ai/plugin/tui";
import { describe, expect, it, vi } from "vitest";

import type { App } from "../../src/apps.js";
import {
  OPEN_FAVOURITE_COMMAND_ID,
  OPEN_FAVOURITE_KEYBINDING,
} from "../../src/keymap.js";
import { createOpenInAppTui } from "../../src/tui.js";

type RuntimeApi = Partial<TuiPluginApi> & {
  keymap?: unknown;
};

type RegisteredLayer = {
  commands: Array<{
    name: string;
    title: string;
    run: () => void;
  }>;
  bindings: Array<{
    key: string;
    cmd: string;
  }>;
};

const vscode = {
  id: "vscode",
  name: "VS Code",
  command: "code",
  fixedArgs: ["--"],
} as const satisfies App;

function createRuntimeApi(keymap?: unknown) {
  let disposePlugin: (() => void) | undefined;
  let slotPlugin: TuiSlotPlugin | undefined;
  const api: RuntimeApi = {
    keymap,
    kv: {
      get: <Value,>(_key: string, fallback?: Value) => fallback as Value,
      set: vi.fn(),
      ready: true,
    },
    lifecycle: {
      signal: new AbortController().signal,
      onDispose: vi.fn((dispose) => {
        disposePlugin = dispose as () => void;
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
      path: {
        directory: process.cwd(),
        worktree: process.cwd(),
      },
    } as TuiPluginApi["state"],
    ui: {
      toast: vi.fn(),
      dialog: {
        replace: vi.fn(),
        clear: vi.fn(),
      },
      DialogSelect: vi.fn(),
    } as unknown as TuiPluginApi["ui"],
  };

  return {
    api,
    getDisposePlugin: () => disposePlugin,
    getSlotPlugin: () => slotPlugin,
  };
}

async function activatePlugin(api: RuntimeApi) {
  const launch = vi.fn(async () => ({ success: true }) as const);
  const plugin = createOpenInAppTui({
    catalog: { getDetectedApps: async () => [vscode] },
    favouriteStore: {
      get: () => vscode,
      set: vi.fn(),
    },
    launch,
  });
  await plugin.tui(
    api as TuiPluginApi,
    undefined,
    {} as Parameters<typeof plugin.tui>[2],
  );
  await vi.waitFor(() => {
    expect(api.slots?.register).toHaveBeenCalled();
  });
  await Promise.resolve();
  return launch;
}

describe("open favourite keymap", () => {
  it("registers the command and binding, shares the label action, and disposes", async () => {
    const removeLayer = vi.fn();
    const registerLayer = vi.fn((_layer: RegisteredLayer) => removeLayer);
    const runtime = createRuntimeApi({ registerLayer });
    const launch = await activatePlugin(runtime.api);

    expect(registerLayer).toHaveBeenCalledOnce();
    const [layer] = registerLayer.mock.calls[0]!;
    expect(layer.commands).toEqual([
      expect.objectContaining({
        name: OPEN_FAVOURITE_COMMAND_ID,
        title: "Open project root with favourite app",
      }),
    ]);
    expect(layer.bindings).toEqual([
      {
        key: OPEN_FAVOURITE_KEYBINDING,
        cmd: OPEN_FAVOURITE_COMMAND_ID,
      },
    ]);

    layer.commands[0]?.run();
    await vi.waitFor(() => {
      expect(launch).toHaveBeenCalledWith(vscode, process.cwd());
    });

    expect(runtime.getSlotPlugin()?.slots.sidebar_content).toBeTypeOf("function");

    runtime.getDisposePlugin()?.();
    runtime.getSlotPlugin()?.dispose?.();
    expect(removeLayer).toHaveBeenCalledOnce();
  });

  it.each([
    ["absent", undefined],
    ["non-callable", { registerLayer: "not-a-function" }],
  ])("skips an %s keymap while keeping the sidebar control", async (_name, keymap) => {
    const runtime = createRuntimeApi(keymap);

    await expect(activatePlugin(runtime.api)).resolves.toBeTypeOf("function");
    expect(runtime.getSlotPlugin()?.slots.sidebar_content).toBeTypeOf("function");
  });
});
