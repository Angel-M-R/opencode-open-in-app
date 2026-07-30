import { describe, expect, it } from "vitest";

import type { App } from "../../src/apps.js";
import {
  FAVOURITE_APP_KEY,
  FavouriteAppPreference,
  type FavouriteAppKeyValueStore,
} from "../../src/favourite.js";

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

class InMemoryStore implements FavouriteAppKeyValueStore {
  readonly values = new Map<string, unknown>();
  readonly readKeys: string[] = [];
  readonly writtenKeys: string[] = [];

  get<Value = unknown>(key: string, fallback?: Value): Value {
    this.readKeys.push(key);
    return (this.values.has(key) ? this.values.get(key) : fallback) as Value;
  }

  set(key: string, value: unknown): void {
    this.writtenKeys.push(key);
    this.values.set(key, value);
  }
}

describe("favourite app preference", () => {
  it("has no favourite when nothing is stored", () => {
    const preference = new FavouriteAppPreference(new InMemoryStore());

    expect(preference.get(apps)).toBeUndefined();
  });

  it.each([null, 42, "", {}, []])(
    "has no favourite for malformed stored value %#",
    (stored) => {
      const store = new InMemoryStore();
      store.values.set(FAVOURITE_APP_KEY, stored);

      expect(new FavouriteAppPreference(store).get(apps)).toBeUndefined();
    },
  );

  it("has no favourite for an unknown app identifier", () => {
    const store = new InMemoryStore();
    store.values.set(FAVOURITE_APP_KEY, "zed");

    expect(new FavouriteAppPreference(store).get(apps)).toBeUndefined();
  });

  it("has no favourite when the stored app is not detected", () => {
    const store = new InMemoryStore();
    store.values.set(FAVOURITE_APP_KEY, "vscode");

    expect(new FavouriteAppPreference(store).get(apps.slice(1))).toBeUndefined();
  });

  it("writes and reads a favourite round trip", () => {
    const store = new InMemoryStore();
    const preference = new FavouriteAppPreference(store);

    preference.set("cursor");

    expect(preference.get(apps)).toBe(apps[1]);
    expect(store.values.get(FAVOURITE_APP_KEY)).toBe("cursor");
  });

  it("writes the byte-for-byte global key", () => {
    const firstStore = new InMemoryStore();
    const secondStore = new InMemoryStore();

    new FavouriteAppPreference(firstStore).set("vscode");
    new FavouriteAppPreference(secondStore).set("cursor");

    expect(firstStore.writtenKeys).toEqual([FAVOURITE_APP_KEY]);
    expect(secondStore.writtenKeys).toEqual([FAVOURITE_APP_KEY]);
    expect(FAVOURITE_APP_KEY).toBe("opencode-open-in-app:favourite:v1");
  });
});
