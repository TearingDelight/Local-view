import type { NavigationIntent } from "../navigation/NavigationIntent";
import type { InputAdapter, NavigationIntentEmitter } from "./InputAdapter";

type KeyboardNavigationEvent = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "isComposing" | "key" | "metaKey" | "shiftKey"
>;

type SelectionRepeatIntent = Extract<NavigationIntent, { type: "select-previous" | "select-next" }>;

export interface KeyboardSelectionRepeat {
  keyId: string;
  intent: SelectionRepeatIntent;
}

interface ActiveSelectionRepeat {
  keyId: string;
  delayTimer: number | null;
  intervalTimer: number | null;
}

const SELECTION_REPEAT_INITIAL_DELAY_MS = 210;
const SELECTION_REPEAT_INTERVAL_MS = 54;

export class KeyboardInputAdapter implements InputAdapter {
  mount(containerEl: HTMLElement, emit: NavigationIntentEmitter): () => void {
    let activeSelectionRepeat: ActiveSelectionRepeat | null = null;

    const stopSelectionRepeat = (keyId?: string) => {
      if (!activeSelectionRepeat) {
        return;
      }

      if (keyId && activeSelectionRepeat.keyId !== keyId) {
        return;
      }

      if (activeSelectionRepeat.delayTimer !== null) {
        window.clearTimeout(activeSelectionRepeat.delayTimer);
      }

      if (activeSelectionRepeat.intervalTimer !== null) {
        window.clearInterval(activeSelectionRepeat.intervalTimer);
      }

      activeSelectionRepeat = null;
    };

    const startSelectionRepeat = (repeat: KeyboardSelectionRepeat) => {
      if (activeSelectionRepeat?.keyId === repeat.keyId) {
        return;
      }

      stopSelectionRepeat();
      emit(repeat.intent);

      activeSelectionRepeat = {
        keyId: repeat.keyId,
        delayTimer: window.setTimeout(() => {
          if (!activeSelectionRepeat || activeSelectionRepeat.keyId !== repeat.keyId) {
            return;
          }

          activeSelectionRepeat.delayTimer = null;
          activeSelectionRepeat.intervalTimer = window.setInterval(() => {
            emit(repeat.intent);
          }, SELECTION_REPEAT_INTERVAL_MS);
        }, SELECTION_REPEAT_INITIAL_DELAY_MS),
        intervalTimer: null
      };
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyboardTarget(event.target)) {
        return;
      }

      const selectionRepeat = getKeyboardSelectionRepeat(event);
      if (selectionRepeat) {
        event.preventDefault();
        event.stopPropagation();
        startSelectionRepeat(selectionRepeat);
        return;
      }

      const intent = getKeyboardNavigationIntent(event);
      if (!intent) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) {
          stopSelectionRepeat();
        }
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      stopSelectionRepeat();
      emit(intent);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const repeatKeyId = getKeyboardSelectionRepeatKeyId(event);
      if (!repeatKeyId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      stopSelectionRepeat(repeatKeyId);
    };

    const stopAllSelectionRepeats = () => stopSelectionRepeat();

    containerEl.addEventListener("keydown", handleKeyDown);
    containerEl.addEventListener("keyup", handleKeyUp);
    containerEl.addEventListener("focusout", stopAllSelectionRepeats);
    window.addEventListener("blur", stopAllSelectionRepeats);
    document.addEventListener("visibilitychange", stopAllSelectionRepeats);

    return () => {
      stopSelectionRepeat();
      containerEl.removeEventListener("keydown", handleKeyDown);
      containerEl.removeEventListener("keyup", handleKeyUp);
      containerEl.removeEventListener("focusout", stopAllSelectionRepeats);
      window.removeEventListener("blur", stopAllSelectionRepeats);
      document.removeEventListener("visibilitychange", stopAllSelectionRepeats);
    };
  }
}

export function getKeyboardSelectionRepeat(event: KeyboardNavigationEvent): KeyboardSelectionRepeat | null {
  if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return null;
  }

  const keyId = getKeyboardSelectionRepeatKeyId(event);
  if (!keyId) {
    return null;
  }

  return {
    keyId,
    intent: keyId === "KeyA" || keyId === "ArrowLeft" ? { type: "select-previous" } : { type: "select-next" }
  };
}

function getKeyboardSelectionRepeatKeyId(event: Pick<KeyboardEvent, "code" | "key">): string | null {
  switch (event.code) {
    case "KeyA":
      return "KeyA";
    case "KeyD":
      return "KeyD";
  }

  switch (event.key) {
    case "ArrowLeft":
      return "ArrowLeft";
    case "ArrowRight":
      return "ArrowRight";
    default:
      return null;
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
