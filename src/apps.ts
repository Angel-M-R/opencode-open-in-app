import {
  defaultProcessExecutor,
  type ProcessExecutor,
  type ProcessFailureKind,
} from "./process.js";

export type AppId = "vscode" | "cursor" | "explorer";

export interface App {
  readonly id: AppId;
  readonly name: string;
  readonly command: string;
}

export interface AppCatalog {
  getDetectedApps(): Promise<readonly App[]>;
}

export interface AppCatalogDependencies {
  readonly executor?: ProcessExecutor;
  readonly platform?: NodeJS.Platform;
  readonly timeoutMs: number;
}

export interface LaunchDependencies {
  readonly executor?: ProcessExecutor;
  readonly timeoutMs: number;
}

export type LaunchResult =
  | { readonly success: true }
  | { readonly success: false; readonly failure: ProcessFailureKind };

const EDITOR_APPS: readonly App[] = [
  { id: "vscode", name: "VS Code", command: "code" },
  { id: "cursor", name: "Cursor", command: "cursor" },
];

export function resolveExplorerCommand(
  platform: NodeJS.Platform,
): string | undefined {
  switch (platform) {
    case "darwin":
      return "open";
    case "linux":
      return "xdg-open";
    case "win32":
      return "explorer";
    default:
      return undefined;
  }
}

export function createAppCatalog({
  executor = defaultProcessExecutor,
  platform = process.platform,
  timeoutMs,
}: AppCatalogDependencies): AppCatalog {
  const apps = canonicalApps(platform);
  let detectedApps: Promise<readonly App[]> | undefined;

  return {
    getDetectedApps() {
      detectedApps ??= detectApps(apps, executor, timeoutMs);
      return detectedApps;
    },
  };
}

export async function launchApp(
  app: App,
  directory: string,
  {
    executor = defaultProcessExecutor,
    timeoutMs,
  }: LaunchDependencies,
): Promise<LaunchResult> {
  try {
    const result = await executor({
      command: app.command,
      args: [directory],
      cwd: directory,
      timeoutMs,
    });

    if (!result.failure || isSuccessfulWindowsExplorerExit(app, result.failure)) {
      return { success: true };
    }

    return { success: false, failure: result.failure.kind };
  } catch {
    return { success: false, failure: "spawn" };
  }
}

function canonicalApps(platform: NodeJS.Platform): readonly App[] {
  const explorerCommand = resolveExplorerCommand(platform);
  return explorerCommand
    ? [
        ...EDITOR_APPS,
        { id: "explorer", name: "File Explorer", command: explorerCommand },
      ]
    : EDITOR_APPS;
}

async function detectApps(
  apps: readonly App[],
  executor: ProcessExecutor,
  timeoutMs: number,
): Promise<readonly App[]> {
  const detected = await Promise.all(
    apps.map(async (app) => {
      try {
        const result = await executor({
          command: app.command,
          args: ["--version"],
          cwd: process.cwd(),
          timeoutMs,
        });
        return result.failure ? undefined : app;
      } catch {
        return undefined;
      }
    }),
  );

  return detected.filter((app): app is App => app !== undefined);
}

function isSuccessfulWindowsExplorerExit(
  app: App,
  failure: NonNullable<
    Awaited<ReturnType<ProcessExecutor>>["failure"]
  >,
): boolean {
  return (
    app.id === "explorer" &&
    app.command === "explorer" &&
    failure.kind === "exit"
  );
}
