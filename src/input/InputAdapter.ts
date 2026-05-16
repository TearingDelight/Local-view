import type { NavigationIntent } from "../navigation/NavigationIntent";

export type NavigationIntentEmitter = (intent: NavigationIntent) => void;

export interface InputAdapter {
  mount(containerEl: HTMLElement, emit: NavigationIntentEmitter): () => void;
}

