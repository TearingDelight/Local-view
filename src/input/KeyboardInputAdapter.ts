import type { NavigationIntent } from "../navigation/NavigationIntent";
import type { InputAdapter, NavigationIntentEmitter } from "./InputAdapter";

type KeyboardNavigationEvent = Pick<
  KeyboardEvent,
  "altKey" | "ctrlKey" | "isComposing" | "key" | "metaKey" | "shiftKey"
>;

export class KeyboardInputAdapter implements InputAdapter {
  mount(containerEl: HTMLElement, emit: NavigationIntentEmitter): () => void {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyboardTarget(event.target)) {
        return;
      }

      const intent = getKeyboardNavigationIntent(event);
      if (!intent) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      emit(intent);
    };

    containerEl.addEventListener("keydown", handleKeyDown);
    return () => containerEl.removeEventListener("keydown", handleKeyDown);
  }
}

export function getKeyboardNavigationIntent(event: KeyboardNavigationEvent): NavigationIntent | null {
  if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return null;
  }

  switch (event.key.toLowerCase()) {
    case "w":
    case "arrowup":
      return { type: "select-direction", direction: "up" };
    case "d":
    case "arrowright":
      return { type: "select-direction", direction: "right" };
    case "s":
    case "arrowdown":
      return { type: "select-direction", direction: "down" };
    case "a":
    case "arrowleft":
      return { type: "select-direction", direction: "left" };
    case "enter":
    case " ":
      return { type: "open-selected" };
    default:
      return null;
  }
}

function shouldIgnoreKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest("input, textarea, select")) {
    return true;
  }

  const editableEl = target.closest("[contenteditable]");
  return editableEl instanceof HTMLElement && editableEl.isContentEditable;
}
