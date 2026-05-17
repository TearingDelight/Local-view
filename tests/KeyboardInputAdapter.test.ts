import { describe, expect, it } from "vitest";
import { getKeyboardNavigationIntent, getKeyboardSelectionRepeat } from "../src/input/KeyboardInputAdapter";

describe("getKeyboardNavigationIntent", () => {
  it("maps physical WASD keys to ring selection, enter and back", () => {
    expect(intentFor({ code: "KeyA", key: "ф" })).toEqual({ type: "select-previous" });
    expect(intentFor({ code: "KeyD", key: "в" })).toEqual({ type: "select-next" });
    expect(intentFor({ code: "KeyW", key: "ц" })).toEqual({ type: "enter-selected" });
    expect(intentFor({ code: "KeyS", key: "ы" })).toEqual({ type: "back" });
  });

  it("maps arrows to the same navigation model", () => {
    expect(intentFor({ key: "ArrowLeft" })).toEqual({ type: "select-previous" });
    expect(intentFor({ key: "ArrowRight" })).toEqual({ type: "select-next" });
    expect(intentFor({ key: "ArrowUp" })).toEqual({ type: "enter-selected" });
    expect(intentFor({ key: "ArrowDown" })).toEqual({ type: "back" });
  });

  it("maps Enter and Space to opening the selected note file", () => {
    expect(intentFor({ key: "Enter" })).toEqual({ type: "open-selected" });
    expect(intentFor({ key: " " })).toEqual({ type: "open-selected" });
  });

  it("ignores modified keys", () => {
    expect(getKeyboardNavigationIntent({ ...baseEvent({ code: "KeyW", key: "ц" }), metaKey: true })).toBeNull();
    expect(getKeyboardNavigationIntent({ ...baseEvent({ key: "ArrowDown" }), shiftKey: true })).toBeNull();
  });
});

describe("getKeyboardSelectionRepeat", () => {
  it("uses a dedicated repeat path for horizontal selection keys", () => {
    expect(getKeyboardSelectionRepeat(baseEvent({ code: "KeyA", key: "ф" }))).toEqual({
      keyId: "KeyA",
      intent: { type: "select-previous" }
    });
    expect(getKeyboardSelectionRepeat(baseEvent({ code: "KeyD", key: "в" }))).toEqual({
      keyId: "KeyD",
      intent: { type: "select-next" }
    });
    expect(getKeyboardSelectionRepeat(baseEvent({ key: "ArrowLeft" }))).toEqual({
      keyId: "ArrowLeft",
      intent: { type: "select-previous" }
    });
    expect(getKeyboardSelectionRepeat(baseEvent({ key: "ArrowRight" }))).toEqual({
      keyId: "ArrowRight",
      intent: { type: "select-next" }
    });
  });

  it("does not repeat movement or file-opening keys", () => {
    expect(getKeyboardSelectionRepeat(baseEvent({ code: "KeyW", key: "ц" }))).toBeNull();
    expect(getKeyboardSelectionRepeat(baseEvent({ code: "KeyS", key: "ы" }))).toBeNull();
    expect(getKeyboardSelectionRepeat(baseEvent({ key: "Enter" }))).toBeNull();
    expect(getKeyboardSelectionRepeat(baseEvent({ key: " " }))).toBeNull();
  });

  it("ignores modified repeat keys", () => {
    expect(getKeyboardSelectionRepeat({ ...baseEvent({ code: "KeyA", key: "ф" }), metaKey: true })).toBeNull();
    expect(getKeyboardSelectionRepeat({ ...baseEvent({ key: "ArrowRight" }), shiftKey: true })).toBeNull();
  });
});

function intentFor(event: Partial<ReturnType<typeof baseEvent>>) {
  return getKeyboardNavigationIntent(baseEvent(event));
}

function baseEvent(event: Partial<{ code: string; key: string }>) {
  return {
    altKey: false,
    code: event.code ?? "",
    ctrlKey: false,
    isComposing: false,
    key: event.key ?? "",
    metaKey: false,
    shiftKey: false
  };
}
