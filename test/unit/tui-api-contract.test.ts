import type {
  TuiDialogSelectProps,
  TuiPluginModule,
  TuiSlotProps,
} from "@opencode-ai/plugin/tui";
import { describe, expectTypeOf, it } from "vitest";

import type { App } from "../../src/apps.js";
import type { GuardedKeymapApi } from "../../src/keymap.js";
import { registerOpenFavouriteKeymap } from "../../src/keymap.js";
import plugin from "../../src/tui.js";

describe("installed OpenCode TUI type contracts", () => {
  it("keeps the real plugin compatible with the consumed host surfaces", () => {
    expectTypeOf(plugin).toMatchTypeOf<TuiPluginModule>();
    expectTypeOf<TuiSlotProps<"sidebar_content">["session_id"]>()
      .toEqualTypeOf<string>();
    expectTypeOf<TuiDialogSelectProps<App>["options"][number]["value"]>()
      .toEqualTypeOf<App>();
  });

  it("keeps the keymap guard independent of registerLayer's installed signature", () => {
    expectTypeOf(registerOpenFavouriteKeymap)
      .parameter(0)
      .toEqualTypeOf<GuardedKeymapApi>();
    expectTypeOf<GuardedKeymapApi["keymap"]>().toEqualTypeOf<
      unknown | undefined
    >();
  });
});
