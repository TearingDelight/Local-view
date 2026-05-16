import type { NodeId } from "../graph/types";
import type { PositionedNeighborhood } from "../layout/LayoutEngine";

export type RingSelectionStep = "previous" | "next";

export class RingSelectionResolver {
  getInitialSelection(scene: PositionedNeighborhood | null): NodeId | null {
    return scene?.neighbors[0]?.node.id ?? null;
  }

  ensureVisibleSelection(scene: PositionedNeighborhood | null, selectedNodeId: NodeId | null): NodeId | null {
    if (!scene) {
      return null;
    }

    if (selectedNodeId && scene.neighbors.some((node) => node.node.id === selectedNodeId)) {
      return selectedNodeId;
    }

    return this.getInitialSelection(scene);
  }

  resolve(scene: PositionedNeighborhood, step: RingSelectionStep, selectedNodeId: NodeId | null): NodeId | null {
    if (scene.neighbors.length === 0) {
      return null;
    }

    const currentIndex = selectedNodeId
      ? scene.neighbors.findIndex((node) => node.node.id === selectedNodeId)
      : -1;

    if (currentIndex === -1) {
      return this.getInitialSelection(scene);
    }

    const offset = step === "next" ? 1 : -1;
    const nextIndex = (currentIndex + offset + scene.neighbors.length) % scene.neighbors.length;
    return scene.neighbors[nextIndex]?.node.id ?? null;
  }
}
