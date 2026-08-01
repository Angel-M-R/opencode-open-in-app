#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const expectedPaths = [
  "LICENSE",
  "README.md",
  "dist/tui.d.ts",
  "dist/tui.js",
  "package.json",
];

export function assertPackageContents(packJson) {
  const jsonStart = packJson.lastIndexOf("\n[");
  const json = jsonStart === -1 ? packJson : packJson.slice(jsonStart + 1);
  const packs = JSON.parse(json);
  if (packs.length !== 1 || !Array.isArray(packs[0]?.files)) {
    throw new Error("npm pack returned an unexpected JSON structure");
  }

  const actualPaths = packs[0].files.map(({ path }) => path).sort();
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error(
      `package contents differ from allowlist\nexpected: ${expectedPaths.join(", ")}\nactual: ${actualPaths.join(", ")}`,
    );
  }
}

function main() {
  const packJson = execFileSync("npm", ["run", "--silent", "pack:dry-run"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  assertPackageContents(packJson);
  console.log("Package contents match the exact allowlist.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(
      `Package content assertion failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
