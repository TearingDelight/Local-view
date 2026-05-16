import type { NavigationIntent } from "../navigation/NavigationIntent";
import type { InputAdapter, NavigationIntentEmitter } from "./InputAdapter";

type KeyboardNavigationEvent = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "isComposing" | "key" | "metaKey" | "shiftKey"
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

  switch (event.code) {
    case "KeyW":
      return { type: "enter-selected" };
    case "KeyA":
      return { type: "select-previous" };
    case "KeyS":
      return { type: "back" };
    case "KeyD":
      return { type: "select-next" };
  }

  switch (event.key) {
    case "ArrowUp":
      return { type: "enter-selected" };
    case "ArrowLeft":
      return { type: "select-previous" };
    case "ArrowDown":
      return { type: "back" };
    case "ArrowRight":
      return { type: "select-next" };
    case "enter":
    case "Enter":
    case " ":
      return { type: "enter-selected" };
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
