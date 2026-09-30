import { expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import { createRoot, onCleanup } from "solid-js";
import type { Plugin } from "@opencode/plugin/tui";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createOpenInAppTui } from "../../src/tui.js";

const tick = () => new Promise(resolve => setTimeout(resolve, 10));
test("native slots, keyboard picker, preference persistence and session project", async () => {
  const root = mkdtempSync(join(tmpdir(), "open-app-")), session = join(root, "session");
  let rendering: Awaited<ReturnType<typeof testRender>> | undefined;
  let cleanup: (() => void | Promise<void>) | void = undefined;
  try {
    mkdirSync(session);
    const app = { id: "vscode", name: "VS Code", command: "code", fixedArgs: ["--"] } as const;
    const slots: any[] = [], released: any[] = [], commands: any[] = [], launches: string[] = [];
    const saved: { favourite?: string } = {};
    let selection: typeof app | undefined = app;
    let picks = 0, layers = 0, disposedLayers = 0;
    const context = {
      location: { directory: root },
      theme: { text: { muted: "#808080" } },
      storage: { store: () => [saved, async (update: (draft: typeof saved) => void) => update(saved)] },
      data: { session: { get: () => ({ location: { directory: session } }) }, location: { default: () => ({ directory: root }) } },
      ui: {
        // Renderer-free claims mount in a root that the release disposes, like the host does;
        // the sidebar is rendered natively below.
        slot: (slot: any) => {
          slots.push(slot);
          const unmount = slot.prepend !== "sidebar.content" ? createRoot(dispose => { slot.render({}); return dispose; }) : undefined;
          return () => { released.push(slot); unmount?.(); };
        },
        router: { current: () => ({ type: "session", sessionID: "s" }) },
        dialog: { select: async () => { picks++; return selection; } }, toast: { show: () => {} },
      },
      keymap: { layer: (factory: any) => { layers++; commands.push(...factory().commands); onCleanup(() => { disposedLayers++; }); } },
    } as unknown as Plugin.Context;
    const plugin = createOpenInAppTui({ catalog: { getDetectedApps: async () => [app] },
      launch: async (_app, path) => { launches.push(path); return { success: true }; } });
    cleanup = await plugin.setup(context);
    const sidebar = slots.find(slot => slot.prepend === "sidebar.content");
    rendering = await testRender(() => sidebar.render({ sessionID: "s" }), { width: 60, height: 10 });
    await rendering.renderOnce(); await tick();
    expect(rendering.captureCharFrame()).toContain("Open in");
    expect(layers).toBe(1);
    const open = commands.find(command => command.slash.name === "open-in-app");
    const choose = commands.find(command => command.slash.name === "open-in-app-choose");
    expect(commands.filter(command => command.bind === "alt+o")).toHaveLength(1);
    expect(open.bind).toBe("alt+o");
    open.run(); await tick();
    expect(saved.favourite).toBe("vscode"); expect(launches).toEqual([session]);
    open.run(); await tick();
    expect(picks).toBe(1); expect(launches).toEqual([session, session]);
    selection = undefined; choose.run(); await tick();
    expect(picks).toBe(2); expect(launches).toHaveLength(2);
    await cleanup?.(); expect(released).toHaveLength(2); expect(disposedLayers).toBe(1);
    open.run(); await tick(); expect(launches).toHaveLength(2);
  } finally {
    rendering?.renderer.destroy(); await cleanup?.(); rmSync(root, { recursive: true, force: true });
  }
});
