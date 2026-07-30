import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, normalize } from "node:path";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { resolveProjectRoot } from "../../src/project.js";

describe("resolveProjectRoot", () => {
  let root: string;
  let worktree: string;
  let file: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "open-in-app-"));
    worktree = join(root, "worktree");
    file = join(root, "file.txt");
    mkdirSync(worktree);
    writeFileSync(file, "not a directory");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  test("uses the first valid session directory without reading lower priorities", () => {
    vi.spyOn(process, "cwd").mockImplementation(() => {
      throw new Error("cwd should not be read");
    });
    const path = {
      directory: root,
      get worktree(): never {
        throw new Error("worktree should not be read");
      },
    };

    expect(resolveProjectRoot({ state: { path } })).toBe(normalize(root));
  });

  test("skips an invalid directory and uses a valid worktree", () => {
    expect(
      resolveProjectRoot({
        state: {
          path: { directory: join(root, "missing"), worktree },
        },
      }),
    ).toBe(normalize(worktree));
  });

  test("uses a valid cwd after both host paths are invalid", () => {
    vi.spyOn(process, "cwd").mockReturnValue(root);

    expect(
      resolveProjectRoot({
        state: { path: { directory: "relative", worktree: file } },
      }),
    ).toBe(normalize(root));
  });

  test.each([42, null, {}, "", "  ", "relative/path"])(
    "skips an invalid candidate: %p",
    (candidate) => {
      expect(
        resolveProjectRoot({
          state: { path: { directory: candidate, worktree } },
        }),
      ).toBe(normalize(worktree));
    },
  );

  test("skips nonexistent paths and existing files", () => {
    vi.spyOn(process, "cwd").mockReturnValue(root);

    expect(
      resolveProjectRoot({
        state: { path: { directory: join(root, "missing"), worktree: file } },
      }),
    ).toBe(normalize(root));
  });

  test("returns a normalized absolute existing directory", () => {
    const resolved = resolveProjectRoot({
      state: { path: { directory: join(worktree, "..", "worktree") } },
    });

    expect(resolved).toBe(normalize(worktree));
    expect(isAbsolute(resolved!)).toBe(true);
    expect(statSync(resolved!).isDirectory()).toBe(true);
  });

  test("swallows candidate reads, validation failures, and cwd failures", () => {
    vi.spyOn(process, "cwd").mockImplementation(() => {
      throw new Error("cwd unavailable");
    });
    const path = {
      get directory(): never {
        throw new Error("directory unavailable");
      },
      worktree: `${worktree}\0invalid`,
    };

    expect(() => resolveProjectRoot({ state: { path } })).not.toThrow();
    expect(resolveProjectRoot({ state: { path } })).toBeUndefined();
  });

  test("returns no root when every candidate is invalid without reading file state", () => {
    vi.spyOn(process, "cwd").mockReturnValue("relative/cwd");
    let sessionReads = 0;
    const state = {
      path: { directory: file, worktree: join(root, "missing") },
      get session(): never {
        sessionReads += 1;
        throw new Error("file-level state should not be read");
      },
    };

    expect(resolveProjectRoot({ state })).toBeUndefined();
    expect(sessionReads).toBe(0);
  });
});
