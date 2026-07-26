import { describe, expect, test, vi } from "vitest";

const execFile = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({ execFile }));

import { launchApp, type App } from "../../src/apps.js";
import type {
  ProcessExecutor,
} from "../../src/process.js";
import { defaultProcessExecutor } from "../../src/process.js";

const app: App = { id: "vscode", name: "VS Code", command: "code" };
const directory = "/projects/a folder;with&special$characters";
const success = { stdout: "", stderr: "" } as const;

describe("launchApp", () => {
  test("returns success and passes the path as one shell-free argv entry", async () => {
    const executor = vi.fn<ProcessExecutor>(async () => success);

    await expect(
      launchApp(app, directory, { executor, timeoutMs: 100 }),
    ).resolves.toEqual({ success: true });
    expect(executor).toHaveBeenCalledWith({
      command: "code",
      args: [directory],
      cwd: directory,
      timeoutMs: 100,
    });
    expect(executor.mock.calls[0]?.[0]).not.toHaveProperty("shell");
  });

  test.each([
    ["spawn", undefined],
    ["exit", 7],
    ["timeout", undefined],
  ] as const)("returns a %s failure", async (kind, exitCode) => {
    const failure = {
      kind,
      ...(exitCode === undefined ? {} : { exitCode }),
    };
    const executor: ProcessExecutor = async () => ({ ...success, failure });

    await expect(
      launchApp(app, directory, { executor, timeoutMs: 100 }),
    ).resolves.toEqual({ success: false, failure: kind });
  });

  test("treats a non-zero explorer exit as success", async () => {
    const explorer: App = {
      id: "explorer",
      name: "File Explorer",
      command: "explorer",
    };
    const executor: ProcessExecutor = async () => ({
      ...success,
      failure: { kind: "exit", exitCode: 1 },
    });

    await expect(
      launchApp(explorer, directory, { executor, timeoutMs: 100 }),
    ).resolves.toEqual({ success: true });
  });

  test("normalises a rejected executor as a spawn failure", async () => {
    const executor: ProcessExecutor = async () => {
      throw new Error("rejected");
    };

    await expect(
      launchApp(app, directory, { executor, timeoutMs: 100 }),
    ).resolves.toEqual({ success: false, failure: "spawn" });
  });

  test("normalises a synchronous executor throw as a spawn failure", async () => {
    const executor = (() => {
      throw new Error("synchronous");
    }) as ProcessExecutor;

    await expect(
      launchApp(app, directory, { executor, timeoutMs: 100 }),
    ).resolves.toEqual({ success: false, failure: "spawn" });
  });

});

describe("defaultProcessExecutor", () => {
  test("uses execFile with one argv entry and no shell", async () => {
    const execution = defaultProcessExecutor({
      command: "code",
      args: [directory],
      cwd: directory,
      timeoutMs: 100,
    });
    const callback = execFile.mock.calls[0]?.[3] as (
      error: Error | null,
      stdout: string,
      stderr: string,
    ) => void;

    expect(execFile).toHaveBeenCalledWith(
      "code",
      [directory],
      {
        cwd: directory,
        encoding: "utf8",
        timeout: 100,
        windowsHide: true,
      },
      expect.any(Function),
    );

    callback(null, "opened", "");
    await expect(execution).resolves.toEqual({ stdout: "opened", stderr: "" });
  });
});
