import type { InputAdapter, NavigationIntentEmitter } from "./InputAdapter";

export class CompositeInputAdapter implements InputAdapter {
  constructor(private readonly adapters: InputAdapter[]) {}

  mount(containerEl: HTMLElement, emit: NavigationIntentEmitter): () => void {
    const unmountAdapters = this.adapters.map((adapter) => adapter.mount(containerEl, emit));

    return () => {
      for (const unmount of unmountAdapters.reverse()) {
        unmount();
      }
    };
  }
}
