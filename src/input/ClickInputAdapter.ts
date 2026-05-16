import type { InputAdapter, NavigationIntentEmitter } from "./InputAdapter";

const SINGLE_CLICK_DELAY_MS = 420;
const DUPLICATE_OPEN_GUARD_MS = 100;
const DOUBLE_TAP_MAX_DISTANCE_PX = 24;

export interface NodeTap {
  nodeId: string;
  clientX: number;
  clientY: number;
  detail: number;
  time: number;
}

export class ClickInputAdapter implements InputAdapter {
  mount(containerEl: HTMLElement, emit: NavigationIntentEmitter): () => void {
    let pendingClickTimer: number | null = null;
    let pendingNodeId: string | null = null;
    let lastTap: NodeTap | null = null;
    let lastOpenedNodeId: string | null = null;
    let lastOpenedAt = 0;

    const clearPendingClick = () => {
      if (pendingClickTimer !== null) {
        window.clearTimeout(pendingClickTimer);
        pendingClickTimer = null;
      }
      pendingNodeId = null;
    };

    const emitOpenNode = (nodeId: string) => {
      const now = Date.now();
      if (lastOpenedNodeId === nodeId && now - lastOpenedAt < DUPLICATE_OPEN_GUARD_MS) {
        return;
      }

      lastOpenedNodeId = nodeId;
      lastOpenedAt = now;
      emit({ type: "open-node", nodeId });
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
        const tap: NodeTap = {
          nodeId,
          clientX: event.clientX,
          clientY: event.clientY,
          detail: event.detail,
          time: Date.now()
        };

        if (shouldOpenNodeFromTap(tap, lastTap)) {
          event.preventDefault();
          clearPendingClick();
          lastTap = null;
          emitOpenNode(nodeId);
          return;
        }

        lastTap = tap;

        if (!nodeEl.classList.contains("is-neighbor")) {
          clearPendingClick();
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
      emitOpenNode(nodeId);
    };

    containerEl.addEventListener("click", handleClick);
    containerEl.addEventListener("dblclick", handleDoubleClick);
    return () => {
      clearPendingClick();
      lastTap = null;
      containerEl.removeEventListener("click", handleClick);
      containerEl.removeEventListener("dblclick", handleDoubleClick);
    };
  }
}

export function shouldOpenNodeFromTap(
  tap: NodeTap,
  previousTap: NodeTap | null,
  maxDelayMs = SINGLE_CLICK_DELAY_MS,
  maxDistancePx = DOUBLE_TAP_MAX_DISTANCE_PX
): boolean {
  if (tap.detail > 1) {
    return true;
  }

  if (!previousTap || previousTap.nodeId !== tap.nodeId) {
    return false;
  }

  if (tap.time - previousTap.time > maxDelayMs) {
    return false;
  }

  return Math.hypot(tap.clientX - previousTap.clientX, tap.clientY - previousTap.clientY) <= maxDistancePx;
}
