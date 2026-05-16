import { describe, expect, it } from "vitest";
import { getKeyboardNavigationIntent } from "../src/input/KeyboardInputAdapter";

describe("getKeyboardNavigationIntent", () => {
  it("maps WASD and arrow keys to selection intents", () => {
    expect(intentFor("w")).toEqual({ type: "select-direction", direction: "up" });
    expect(intentFor("ArrowRight")).toEqual({ type: "select-direction", direction: "right" });
    expect(intentFor("s")).toEqual({ type: "select-direction", direction: "down" });
    expect(intentFor("ArrowLeft")).toEqual({ type: "select-direction", direction: "left" });
  });

  it("maps Enter and Space to opening the selected note", () => {
    expect(intentFor("Enter")).toEqual({ type: "open-selected" });
    expect(intentFor(" ")).toEqual({ type: "open-selected" });
  });

  it("ignores modified keys", () => {
    expect(getKeyboardNavigationIntent({ ...baseEvent("w"), metaKey: true })).toBeNull();
    expect(getKeyboardNavigationIntent({ ...baseEvent("ArrowDown"), shiftKey: true })).toBeNull();
  });
});

function intentFor(key: string) {
  return getKeyboardNavigationIntent(baseEvent(key));
}

function baseEvent(key: string) {
  return {
    altKey: false,
    ctrlKey: false,
    isComposing: false,
    key,
    metaKey: false,
    shiftKey: false
  };
}
