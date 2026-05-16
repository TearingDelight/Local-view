import { describe, expect, it } from "vitest";
import { getKeyboardNavigationIntent } from "../src/input/KeyboardInputAdapter";

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

  it("maps Enter and Space to entering the selected note", () => {
    expect(intentFor({ key: "Enter" })).toEqual({ type: "enter-selected" });
    expect(intentFor({ key: " " })).toEqual({ type: "enter-selected" });
  });

  it("ignores modified keys", () => {
    expect(getKeyboardNavigationIntent({ ...baseEvent({ code: "KeyW", key: "ц" }), metaKey: true })).toBeNull();
    expect(getKeyboardNavigationIntent({ ...baseEvent({ key: "ArrowDown" }), shiftKey: true })).toBeNull();
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
