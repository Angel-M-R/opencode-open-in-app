import type {
  TuiPlugin,
  TuiPluginApi,
  TuiPluginModule,
  TuiSlotPlugin,
  TuiThemeCurrent,
} from "@opencode-ai/plugin/tui";
import { createRoot, createSignal, onCleanup } from "solid-js";

import {
  createAppCatalog,
  launchApp,
  type App,
  type AppCatalog,
  type LaunchResult,
} from "./apps.js";
import { createActivationRegionHandlers } from "./interaction.js";
import {
  createApplicationPicker,
  type ApplicationPickerDialogSurface,
  type FavouriteAppStore,
} from "./picker.js";
import { FavouriteAppPreference } from "./favourite.js";
import { registerOpenFavouriteKeymap } from "./keymap.js";
import { resolveProjectRoot } from "./project.js";

export const SIDEBAR_CONTENT_SLOT_ORDER = 89;
export const DEFAULT_PROCESS_TIMEOUT_MS = 1_500;

export interface OpenInAppTuiDependencies {
  readonly catalog?: AppCatalog;
  readonly launch?: (app: App, projectRoot: string) => Promise<LaunchResult>;
  readonly favouriteStore?: FavouriteAppStore;
}

export function createOpenInAppTui(
  dependencies: OpenInAppTuiDependencies = {},
): TuiPluginModule {
  const tui: TuiPlugin = async (api) => {
    const catalog =
      dependencies.catalog ??
      createAppCatalog({ timeoutMs: DEFAULT_PROCESS_TIMEOUT_MS });
    const store =
      dependencies.favouriteStore ?? new FavouriteAppPreference(api.kv);

    createRoot((disposeRoot) => {
      const [displayedFavourite, setDisplayedFavourite] = createSignal<
        App | undefined
      >(undefined);
      let lifecycleDisposed = false;
      let removeKeymapLayer: (() => void) | undefined;
      const dispose = (): void => {
        if (lifecycleDisposed) return;
        lifecycleDisposed = true;
        removeKeymapLayer?.();
        removeKeymapLayer = undefined;
        disposeRoot();
      };

      const removeLifecycleHandler = api.lifecycle.onDispose(dispose);
      onCleanup(removeLifecycleHandler);

      const picker = createApplicationPicker({
        catalog,
        store,
        dialog: createDialogSurface(api),
        toast: (message) => api.ui.toast({ variant: "warning", message }),
        launch:
          dependencies.launch ??
          ((app, projectRoot) =>
            launchApp(app, projectRoot, {
              timeoutMs: DEFAULT_PROCESS_TIMEOUT_MS,
            })),
        onFavouriteChanged: setDisplayedFavourite,
      });
      void resolvePersistedFavourite(catalog, store).then((app) => {
        if (!lifecycleDisposed && app) setDisplayedFavourite(app);
      });

      const openPicker = (): void => {
        const projectRoot = resolveProjectRoot(api);
        if (projectRoot) void picker.open(projectRoot);
      };
      const activateFavourite = (): void => {
        const projectRoot = resolveProjectRoot(api);
        if (!projectRoot) return;

        const favourite = displayedFavourite();
        if (favourite) {
          void picker.launch(favourite, projectRoot);
        } else {
          void picker.open(projectRoot);
        }
      };
      const registeredKeymapLayer = registerOpenFavouriteKeymap(
        api,
        activateFavourite,
      );
      if (lifecycleDisposed) {
        registeredKeymapLayer?.();
      } else {
        removeKeymapLayer = registeredKeymapLayer;
      }

      const slotRegistration = {
        order: SIDEBAR_CONTENT_SLOT_ORDER,
        slots: {
          sidebar_content(context) {
            return (
              <OpenInAppControl
                favourite={displayedFavourite()}
                theme={context.theme.current}
                activateLabel={activateFavourite}
                activateChevron={openPicker}
              />
            );
          },
        },
        dispose,
      } satisfies TuiSlotPlugin;
      api.slots.register(slotRegistration);
    });
  };

  return {
    id: "opencode-open-in-app",
    tui,
  };
}

function OpenInAppControl(props: {
  readonly favourite: App | undefined;
  readonly theme: TuiThemeCurrent;
  readonly activateLabel: () => void;
  readonly activateChevron: () => void;
}) {
  const label = createActivationRegionHandlers(props.activateLabel);
  const chevron = createActivationRegionHandlers(props.activateChevron);

  return (
    <box height={1} flexDirection="row">
      <box
        height={1}
        focusable
        onMouseDown={label.onMouseDown}
        onMouseUp={label.onMouseUp}
        onKeyDown={label.onKeyDown}
      >
        <text
          height={1}
          wrapMode="none"
          truncate
          selectable={false}
          fg={props.theme.textMuted}
        >
          {`Open in${props.favourite ? ` ${props.favourite.name}` : ""} `}
        </text>
      </box>
      <box
        height={1}
        focusable
        onMouseDown={chevron.onMouseDown}
        onMouseUp={chevron.onMouseUp}
        onKeyDown={chevron.onKeyDown}
      >
        <text
          height={1}
          wrapMode="none"
          truncate
          selectable={false}
          fg={props.theme.textMuted}
        >
          ↓
        </text>
      </box>
    </box>
  );
}

async function resolvePersistedFavourite(
  catalog: AppCatalog,
  store: FavouriteAppStore,
): Promise<App | undefined> {
  let detectedApps: readonly App[];
  try {
    detectedApps = await catalog.getDetectedApps();
  } catch {
    return undefined;
  }

  try {
    return store.get(detectedApps);
  } catch {
    return undefined;
  }
}

function createDialogSurface(api: TuiPluginApi): ApplicationPickerDialogSurface {
  return {
    show({ title, options, onSelect }) {
      api.ui.dialog.replace(() =>
        api.ui.DialogSelect({
          title,
          options: [...options],
          onSelect(option) {
            api.ui.dialog.clear();
            onSelect(option.value);
          },
        }),
      );
    },
  };
}

const plugin = createOpenInAppTui();

export default plugin;
