import { afterEach, describe, expect, test, vi } from "vitest";

import { resolveProjectRoot } from "../../src/project.js";

describe("resolveProjectRoot", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("uses the session directory when present", () => {
    vi.spyOn(process, "cwd").mockImplementation(() => {
      throw new Error("cwd should not be read");
    });

    const path = {
      directory: "/projects/current",
      get worktree(): string {
        throw new Error("worktree should not be read");
      },
    };

    expect(resolveProjectRoot({ state: { path } })).toBe("/projects/current");
  });

  test("uses the worktree when the session directory is blank", () => {
    expect(
      resolveProjectRoot({
        state: {
          path: { directory: "  \t", worktree: "/projects/worktree" },
        },
      }),
    ).toBe("/projects/worktree");
  });

  test("falls back to cwd when host paths are absent", () => {
    vi.spyOn(process, "cwd").mockReturnValue("/projects/cwd");

    expect(resolveProjectRoot({ state: { path: {} } })).toBe("/projects/cwd");
  });

  test.each([42, null, { directory: "/not-a-string" }])(
    "skips non-string path candidates: %p",
    (candidate) => {
      vi.spyOn(process, "cwd").mockReturnValue("/projects/cwd");

      expect(
        resolveProjectRoot({
          state: { path: { directory: candidate, worktree: candidate } },
        }),
      ).toBe("/projects/cwd");
    },
  );

  test("returns a non-empty root without reading file-level session state", () => {
    vi.spyOn(process, "cwd").mockReturnValue("/projects/cwd");
    let sessionReads = 0;
    const state = {
      path: { directory: "", worktree: "\n" },
      get session(): never {
        sessionReads += 1;
        throw new Error("file-level session state should not be read");
      },
    };

    const root = resolveProjectRoot({ state });

    expect(root).toBe("/projects/cwd");
    expect(root).not.toBe("");
    expect(sessionReads).toBe(0);
  });
});
