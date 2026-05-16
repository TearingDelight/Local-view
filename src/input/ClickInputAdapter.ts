import type { InputAdapter, NavigationIntentEmitter } from "./InputAdapter";

export class ClickInputAdapter implements InputAdapter {
  mount(containerEl: HTMLElement, emit: NavigationIntentEmitter): () => void {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const actionEl = target.closest("[data-local-view-action]") as HTMLElement | null;
      if (actionEl?.dataset.localViewAction === "back") {
        emit({ type: "back" });
        return;
      }

      const nodeEl = target.closest("[data-local-view-node-id]") as HTMLElement | null;
      const nodeId = nodeEl?.dataset.localViewNodeId;
      if (nodeId) {
        emit({ type: "move-to", nodeId });
      }
    };

    containerEl.addEventListener("click", handleClick);
    return () => containerEl.removeEventListener("click", handleClick);
  }
}

