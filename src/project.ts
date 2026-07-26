interface ProjectPathApi {
  readonly state: {
    readonly path: {
      readonly directory?: unknown;
      readonly worktree?: unknown;
    };
  };
}

export function resolveProjectRoot(api: ProjectPathApi): string {
  return (
    nonEmptyString(api.state.path.directory) ??
    nonEmptyString(api.state.path.worktree) ??
    process.cwd()
  );
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}
