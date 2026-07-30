import { describe, expect, test, vi } from "vitest";

import {
  createAppCatalog,
  launchApp,
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
      {
        id: "vscode",
        name: "VS Code",
        command: "code",
        fixedArgs: ["--"],
      },
      {
        id: "cursor",
        name: "Cursor",
        command: "cursor",
        fixedArgs: ["--"],
      },
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

  test("detects the macOS explorer by resolving it instead of requesting a version", async () => {
    const executor = vi.fn<ProcessExecutor>(async ({ command, args }) =>
      command === "open" && args[0] === "--version"
        ? { ...success, failure: { kind: "exit" } }
        : success,
    );
    const catalog = createAppCatalog({
      executor,
      platform: "darwin",
      timeoutMs: 25,
    });

    const detected = await catalog.getDetectedApps();

    expect(detected.map(({ id }) => id)).toEqual([
      "vscode",
      "cursor",
      "explorer",
    ]);
    expect(executor).toHaveBeenCalledWith({
      command: "which",
      args: ["open"],
      cwd: process.cwd(),
      timeoutMs: 25,
    });
    expect(executor).not.toHaveBeenCalledWith(
      expect.objectContaining({ command: "open", args: ["--version"] }),
    );
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

  test("uses the supported option terminator for both editor launch templates", async () => {
    const catalog = createAppCatalog({
      executor: async () => success,
      platform: "darwin",
      timeoutMs: 25,
    });
    const [vscode, cursor] = await catalog.getDetectedApps();
    const executor = vi.fn<ProcessExecutor>(async () => success);
    const projectRoot = "/projects/-option-like root";

    await launchApp(vscode!, projectRoot, { executor, timeoutMs: 100 });
    await launchApp(cursor!, projectRoot, { executor, timeoutMs: 100 });

    expect(executor).toHaveBeenNthCalledWith(1, {
      command: "code",
      args: ["--", projectRoot],
      cwd: projectRoot,
      timeoutMs: 100,
    });
    expect(executor).toHaveBeenNthCalledWith(2, {
      command: "cursor",
      args: ["--", projectRoot],
      cwd: projectRoot,
      timeoutMs: 100,
    });
  });

  test.each([
    ["darwin", "open", ["-a", "Finder", "--"]],
    ["linux", "xdg-open", []],
    ["win32", "explorer", []],
  ] as const)(
    "uses %s's fixed shell-free explorer template",
    async (platform, command, fixedArgs) => {
      const catalog = createAppCatalog({
        executor: async () => success,
        platform,
        timeoutMs: 25,
      });
      const detected = await catalog.getDetectedApps();
      const explorer = detected.find((app) => app.id === "explorer");
      const executor = vi.fn<ProcessExecutor>(async () => success);
      const projectRoot = "/projects/a root;&$";

      if (!explorer) throw new Error("explorer was not detected");
      await launchApp(explorer, projectRoot, { executor, timeoutMs: 100 });

      expect(executor).toHaveBeenCalledWith({
        command,
        args: [...fixedArgs, projectRoot],
        cwd: projectRoot,
        timeoutMs: 100,
      });
    },
  );
});
