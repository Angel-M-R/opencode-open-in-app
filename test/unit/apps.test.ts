import { describe, expect, test, vi } from "vitest";

import {
  createAppCatalog,
  resolveExplorerCommand,
} from "../../src/apps.js";
import type { ProcessExecutor } from "../../src/process.js";

const success = { stdout: "", stderr: "" } as const;

describe("resolveExplorerCommand", () => {
  test.each([
    ["darwin", "open"],
    ["linux", "xdg-open"],
    ["win32", "explorer"],
  ] as const)("uses %s's explorer command", (platform, command) => {
    expect(resolveExplorerCommand(platform)).toBe(command);
  });

  test("returns undefined on unsupported platforms", () => {
    expect(resolveExplorerCommand("freebsd")).toBeUndefined();
  });
});

describe("createAppCatalog", () => {
  test("returns detected apps in canonical order and hides unsupported explorer", async () => {
    const executor = vi.fn<ProcessExecutor>(async () => success);
    const catalog = createAppCatalog({
      executor,
      platform: "freebsd",
      timeoutMs: 25,
    });

    await expect(catalog.getDetectedApps()).resolves.toEqual([
      { id: "vscode", name: "VS Code", command: "code" },
      { id: "cursor", name: "Cursor", command: "cursor" },
    ]);
    expect(executor).toHaveBeenCalledTimes(2);
  });

  test("probes each app only once across repeated calls", async () => {
    const executor = vi.fn<ProcessExecutor>(async () => success);
    const catalog = createAppCatalog({
      executor,
      platform: "darwin",
      timeoutMs: 25,
    });

    const first = await catalog.getDetectedApps();
    const second = await catalog.getDetectedApps();

    expect(first.map(({ command }) => command)).toEqual(["code", "cursor", "open"]);
    expect(second).toBe(first);
    expect(executor).toHaveBeenCalledTimes(3);
  });

  test("treats a probe timeout as not detected", async () => {
    const executor = vi.fn<ProcessExecutor>(async ({ command }) =>
      command === "cursor"
        ? { ...success, failure: { kind: "timeout" } }
        : success,
    );
    const catalog = createAppCatalog({
      executor,
      platform: "linux",
      timeoutMs: 25,
    });

    const apps = await catalog.getDetectedApps();

    expect(apps.map(({ command }) => command)).toEqual(["code", "xdg-open"]);
  });

  test("a new catalog instance re-probes", async () => {
    const executor = vi.fn<ProcessExecutor>(async () => success);
    const dependencies = {
      executor,
      platform: "win32" as const,
      timeoutMs: 25,
    };

    await createAppCatalog(dependencies).getDetectedApps();
    await createAppCatalog(dependencies).getDetectedApps();

    expect(executor).toHaveBeenCalledTimes(6);
  });
});
