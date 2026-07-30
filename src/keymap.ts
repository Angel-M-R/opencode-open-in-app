export const OPEN_FAVOURITE_COMMAND_ID =
  "opencode-open-in-app.open-project-root-with-favourite";
export const OPEN_FAVOURITE_KEYBINDING = "alt+o";

type KeymapCommand = {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly run: () => void;
};

type KeymapBinding = {
  readonly key: string;
  readonly cmd: string;
};

type KeymapLayer = {
  readonly commands: readonly KeymapCommand[];
  readonly bindings: readonly KeymapBinding[];
};

type KeymapLayerRegistrar = (layer: KeymapLayer) => unknown;

export interface GuardedKeymapApi {
  readonly keymap?: unknown;
}

export function registerOpenFavouriteKeymap(
  api: GuardedKeymapApi,
  activateFavourite: () => void,
): (() => void) | undefined {
  try {
    const keymap = api.keymap;

    // Installed @opencode-ai/plugin names TuiKeymap via @opentui/keymap, but node_modules/@opentui contains only core and solid; the missing package leaves no usable typed surface, so this guard stays structural.
    if (typeof keymap !== "object" || keymap === null) return undefined;

    const registerLayer = (keymap as { readonly registerLayer?: unknown })
      .registerLayer;
    if (typeof registerLayer !== "function") return undefined;

    const dispose = (registerLayer as KeymapLayerRegistrar).call(keymap, {
      commands: [
        {
          name: OPEN_FAVOURITE_COMMAND_ID,
          title: "Open project root with favourite app",
          description: "Open the current project root with the favourite app",
          category: "Open in app",
          run: activateFavourite,
        },
      ],
      bindings: [
        {
          key: OPEN_FAVOURITE_KEYBINDING,
          cmd: OPEN_FAVOURITE_COMMAND_ID,
        },
      ],
    });

    return typeof dispose === "function" ? (dispose as () => void) : undefined;
  } catch {
    return undefined;
  }
}
