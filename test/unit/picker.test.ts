import { describe, expect, it, vi } from "vitest";

import { createAppCatalog, type App, type AppId } from "../../src/apps.js";
import type { ProcessExecutor, ProcessFailureKind } from "../../src/process.js";
import {
  createApplicationPicker,
  type ApplicationPickerDialogSurface,
  type ApplicationPickerOption,
  type FavouriteAppStore,
} from "../../src/picker.js";

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

class FakeDialogSurface implements ApplicationPickerDialogSurface {
  show = vi.fn(
    (input: {
      readonly title: string;
      readonly options: readonly ApplicationPickerOption[];
      readonly onSelect: (app: App) => void;
    }) => {
      this.current = input;
    },
  );

  current:
    | {
        readonly title: string;
        readonly options: readonly ApplicationPickerOption[];
        readonly onSelect: (app: App) => void;
      }
    | undefined;

  select(index: number): void {
    const option = this.current?.options[index];
    if (!option || !this.current) throw new Error("No selectable dialog option");
    this.current.onSelect(option.value);
    this.current = undefined;
  }

  dismiss(): void {
    this.current = undefined;
  }
}

function fakeStore(initialValue?: AppId) {
  let value: unknown = initialValue;
  const store: FavouriteAppStore = {
    get: vi.fn((detectedApps) =>
      detectedApps.find((app: App) => app.id === value),
    ),
    set: vi.fn((appId) => {
      value = appId;
    }),
  };

  return { store, value: () => value };
}

describe("application picker", () => {
  it("lists detected apps in canonical order, then persists and launches the selection", async () => {
    const dialog = new FakeDialogSurface();
    const favourite = fakeStore("vscode");
    let storedAtLaunch: unknown;
    const launch = vi.fn(async () => {
      storedAtLaunch = favourite.value();
      return { success: true } as const;
    });
    let storedAtFavouriteChange: unknown;
    const onFavouriteChanged = vi.fn(() => {
      storedAtFavouriteChange = favourite.value();
    });
    const picker = createApplicationPicker({
      catalog: { getDetectedApps: async () => apps },
      store: favourite.store,
      dialog,
      toast: vi.fn(),
      launch,
      onFavouriteChanged,
    });

    await picker.open("/project/root");

    expect(dialog.current?.options.map(({ title }) => title)).toEqual([
      "VS Code",
      "Cursor",
      "File Explorer",
    ]);
    dialog.select(1);
    await vi.waitFor(() => expect(launch).toHaveBeenCalledOnce());

    expect(favourite.store.set).toHaveBeenCalledWith("cursor");
    expect(storedAtFavouriteChange).toBe("cursor");
    expect(storedAtLaunch).toBe("cursor");
    expect(onFavouriteChanged).toHaveBeenCalledWith(apps[1]);
    expect(launch).toHaveBeenCalledWith(apps[1], "/project/root");
  });

  it("changes nothing when the dialog is dismissed", async () => {
    const dialog = new FakeDialogSurface();
    const favourite = fakeStore("vscode");
    const launch = vi.fn(async () => ({ success: true }) as const);
    const onFavouriteChanged = vi.fn();
    const picker = createApplicationPicker({
      catalog: { getDetectedApps: async () => apps },
      store: favourite.store,
      dialog,
      toast: vi.fn(),
      launch,
      onFavouriteChanged,
    });

    await picker.open("/project/root");
    dialog.dismiss();

    expect(favourite.value()).toBe("vscode");
    expect(favourite.store.set).not.toHaveBeenCalled();
    expect(onFavouriteChanged).not.toHaveBeenCalled();
    expect(launch).not.toHaveBeenCalled();
  });

  it("toasts without opening or launching when no apps are detected", async () => {
    const dialog = new FakeDialogSurface();
    const favourite = fakeStore("vscode");
    const toast = vi.fn();
    const launch = vi.fn(async () => ({ success: true }) as const);
    const picker = createApplicationPicker({
      catalog: { getDetectedApps: async () => [] },
      store: favourite.store,
      dialog,
      toast,
      launch,
      onFavouriteChanged: vi.fn(),
    });

    await picker.open("/project/root");
    expect(toast).toHaveBeenCalledOnce();
    toast.mockClear();

    expect(dialog.show).not.toHaveBeenCalled();
    expect(favourite.store.set).not.toHaveBeenCalled();
    expect(launch).not.toHaveBeenCalled();
  });

  it.each([
    ["spawn", "spawn"],
    ["exit", "exit"],
    ["timeout", "timeout"],
  ] as const)("reports a %s launch failure with the app name", async (_case, failure) => {
    const toast = vi.fn();
    const picker = createApplicationPicker({
      catalog: { getDetectedApps: async () => [apps[0]] },
      store: fakeStore("vscode").store,
      dialog: new FakeDialogSurface(),
      toast,
      launch: async () => ({ success: false, failure }),
      onFavouriteChanged: vi.fn(),
    });

    await expect(picker.launch(apps[0], "/project/root")).resolves.toBeUndefined();
    expect(toast).toHaveBeenCalledWith(
      `Failed to launch VS Code: ${failure}.`,
    );
  });

  it("normalises a rejected launch, reports it, and does not reject into the host", async () => {
    const toast = vi.fn();
    const picker = createApplicationPicker({
      catalog: { getDetectedApps: async () => [apps[1]] },
      store: fakeStore("cursor").store,
      dialog: new FakeDialogSurface(),
      toast,
      launch: async () => {
        throw new Error("executor rejected");
      },
      onFavouriteChanged: vi.fn(),
    });

    await expect(picker.launch(apps[1], "/project/root")).resolves.toBeUndefined();
    expect(toast).toHaveBeenCalledWith(
      "Failed to launch Cursor: spawn.",
    );
  });

  it("does not show an error toast after a successful launch", async () => {
    const toast = vi.fn();
    const picker = createApplicationPicker({
      catalog: { getDetectedApps: async () => [apps[0]] },
      store: fakeStore("vscode").store,
      dialog: new FakeDialogSurface(),
      toast,
      launch: async () => ({ success: true }),
      onFavouriteChanged: vi.fn(),
    });

    await expect(picker.launch(apps[0], "/project/root")).resolves.toBeUndefined();
    expect(toast).not.toHaveBeenCalled();
  });

  it("keeps detection failures silent and omits the undetected app", async () => {
    const executor = vi.fn<ProcessExecutor>(async ({ command }) =>
      command === "cursor"
        ? {
            stdout: "",
            stderr: "",
            failure: { kind: "timeout" as ProcessFailureKind },
          }
        : { stdout: "", stderr: "" },
    );
    const dialog = new FakeDialogSurface();
    const toast = vi.fn();
    const picker = createApplicationPicker({
      catalog: createAppCatalog({ executor, platform: "darwin", timeoutMs: 25 }),
      store: fakeStore("vscode").store,
      dialog,
      toast,
      launch: async () => ({ success: true }),
      onFavouriteChanged: vi.fn(),
    });

    await expect(picker.open("/project/root")).resolves.toBeUndefined();
    expect(dialog.current?.options.map(({ value }) => value.id)).toEqual([
      "vscode",
      "explorer",
    ]);
    expect(toast).not.toHaveBeenCalled();
  });

  it("contains synchronous host-surface exceptions", async () => {
    const picker = createApplicationPicker({
      catalog: { getDetectedApps: async () => apps },
      store: {
        get: () => {
          throw new Error("kv get failed");
        },
        set: () => {
          throw new Error("kv set failed");
        },
      },
      dialog: {
        show: () => {
          throw new Error("dialog failed");
        },
      },
      toast: () => {
        throw new Error("toast failed");
      },
      launch: async () => ({ success: false, failure: "spawn" }),
      onFavouriteChanged: () => {
        throw new Error("display callback failed");
      },
    });

    await expect(picker.launch(apps[0], "/project/root")).resolves.toBeUndefined();
    await expect(picker.open("/project/root")).resolves.toBeUndefined();
  });

  it("reports a picker dialog that fails to open", async () => {
    const toast = vi.fn();
    const picker = createApplicationPicker({
      catalog: { getDetectedApps: async () => apps },
      store: { get: () => undefined, set: () => {} },
      dialog: {
        show: () => {
          throw new Error("dialog failed");
        },
      },
      toast,
      launch: async () => ({ success: true }),
      onFavouriteChanged: () => {},
    });

    await picker.open("/project/root");

    expect(toast).toHaveBeenCalledOnce();
  });
});
