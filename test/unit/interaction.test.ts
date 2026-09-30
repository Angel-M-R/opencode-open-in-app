import { describe, expect, it, vi } from "vitest";

import {
  activateFromKey,
  activateFromMouse,
  createActivationRegionHandlers,
} from "../../src/interaction.js";

function keyEvent(name: string) {
  return {
    name,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

function mouseEvent(button: number) {
  return {
    button,
    target: { focus: vi.fn() },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

describe("activation interaction", () => {
  it("ignores non-primary mouse buttons", () => {
    const event = mouseEvent(2);
    const activate = vi.fn();

    expect(activateFromMouse(event, activate)).toBe(false);
    expect(activate).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(event.target.focus).not.toHaveBeenCalled();
  });

  it("does not consume keys other than enter or space", () => {
    const event = keyEvent("escape");
    const activate = vi.fn();

    expect(activateFromKey(event, activate)).toBe(false);
    expect(activate).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });

  it.each(["return", "space"])("handles the %s key without bubbling", (name) => {
    const event = keyEvent(name);
    const activate = vi.fn();

    expect(activateFromKey(event, activate)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(activate).toHaveBeenCalledOnce();
  });

  it.each([
    ["repeated flag", { repeated: true }],
    ["repeat event type", { eventType: "repeat" as const }],
  ])("consumes a held %s key without relaunching", (_label, repeat) => {
    const event = { ...keyEvent("return"), ...repeat };
    const activate = vi.fn();

    expect(activateFromKey(event, activate)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(activate).not.toHaveBeenCalled();
  });

  it("handles a primary mouse event, focuses its target, and stops bubbling", () => {
    const event = mouseEvent(0);
    const activate = vi.fn();

    expect(activateFromMouse(event, activate)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(event.target.focus).toHaveBeenCalledOnce();
    expect(activate).toHaveBeenCalledOnce();
  });

  it("keeps label and chevron press-release actions distinct", () => {
    const activateLabel = vi.fn();
    const activateChevron = vi.fn();
    const label = createActivationRegionHandlers(activateLabel);
    const chevron = createActivationRegionHandlers(activateChevron);

    label.onMouseDown(mouseEvent(0));
    chevron.onMouseUp(mouseEvent(0));
    expect(activateLabel).not.toHaveBeenCalled();
    expect(activateChevron).not.toHaveBeenCalled();

    label.onMouseDown(mouseEvent(0));
    label.onMouseUp(mouseEvent(0));
    expect(activateLabel).toHaveBeenCalledOnce();
    expect(activateChevron).not.toHaveBeenCalled();

    chevron.onMouseDown(mouseEvent(0));
    chevron.onMouseUp(mouseEvent(0));
    expect(activateChevron).toHaveBeenCalledOnce();
    expect(activateLabel).toHaveBeenCalledOnce();
  });
});
