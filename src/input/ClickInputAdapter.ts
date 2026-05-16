import type { InputAdapter, NavigationIntentEmitter } from "./InputAdapter";

const SINGLE_CLICK_DELAY_MS = 220;

export class ClickInputAdapter implements InputAdapter {
  mount(containerEl: HTMLElement, emit: NavigationIntentEmitter): () => void {
    let pendingClickTimer: number | null = null;
    let pendingNodeId: string | null = null;

    const clearPendingClick = () => {
      if (pendingClickTimer !== null) {
        window.clearTimeout(pendingClickTimer);
        pendingClickTimer = null;
      }
      pendingNodeId = null;
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const actionEl = target.closest("[data-local-view-action]") as HTMLElement | null;
      if (actionEl?.dataset.localViewAction === "back") {
        clearPendingClick();
        emit({ type: "back" });
        return;
      }

      const nodeEl = target.closest("[data-local-view-node-id]") as HTMLElement | null;
      const nodeId = nodeEl?.dataset.localViewNodeId;
      if (nodeId) {
        if (event.detail > 1) {
          return;
        }

        clearPendingClick();
        pendingNodeId = nodeId;
        pendingClickTimer = window.setTimeout(() => {
          if (pendingNodeId) {
            emit({ type: "enter-node", nodeId: pendingNodeId });
          }
          clearPendingClick();
        }, SINGLE_CLICK_DELAY_MS);
      }
    };

    const handleDoubleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const nodeEl = target.closest("[data-local-view-node-id]") as HTMLElement | null;
      const nodeId = nodeEl?.dataset.localViewNodeId;
      if (!nodeId) {
        return;
      }

      event.preventDefault();
      clearPendingClick();
      emit({ type: "open-node", nodeId });
    };

    containerEl.addEventListener("click", handleClick);
    containerEl.addEventListener("dblclick", handleDoubleClick);
    return () => {
      clearPendingClick();
      containerEl.removeEventListener("click", handleClick);
      containerEl.removeEventListener("dblclick", handleDoubleClick);
    };
  }
}
