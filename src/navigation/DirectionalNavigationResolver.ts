import type { NodeId } from "../graph/types";
import type { PositionedNeighborhood, PositionedNode } from "../layout/LayoutEngine";
import type { NavigationDirection } from "./NavigationIntent";

interface DirectionVector {
  x: number;
  y: number;
}

interface RankedCandidate {
  node: PositionedNode;
  anglePenalty: number;
  distance: number;
}

const DIRECTION_VECTORS: Record<NavigationDirection, DirectionVector> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }
};

const MIN_FORWARD_DISTANCE = 0.001;

export class DirectionalNavigationResolver {
  resolve(
    scene: PositionedNeighborhood,
    direction: NavigationDirection,
    selectedNodeId: NodeId | null
  ): NodeId | null {
    if (scene.neighbors.length === 0) {
      return null;
    }

    const selectedNode = selectedNodeId
      ? scene.neighbors.find((node) => node.node.id === selectedNodeId) ?? null
      : null;
    const origin = selectedNode ?? scene.center;
    const candidates = selectedNode
      ? scene.neighbors.filter((node) => node.node.id !== selectedNode.node.id)
      : scene.neighbors;
    const ranked = rankCandidates(origin, candidates, DIRECTION_VECTORS[direction]);

    return ranked[0]?.node.node.id ?? null;
  }
}

function rankCandidates(
  origin: PositionedNode,
  candidates: PositionedNode[],
  direction: DirectionVector
): RankedCandidate[] {
  return candidates
    .map((node): RankedCandidate | null => {
      const x = node.x - origin.x;
      const y = node.y - origin.y;
      const forwardDistance = x * direction.x + y * direction.y;

      if (forwardDistance <= MIN_FORWARD_DISTANCE) {
        return null;
      }

      const distance = Math.hypot(x, y);
      if (distance <= MIN_FORWARD_DISTANCE) {
        return null;
      }

      return {
        node,
        anglePenalty: 1 - forwardDistance / distance,
        distance
      };
    })
    .filter((candidate): candidate is RankedCandidate => candidate !== null)
    .sort(compareRankedCandidates);
}

function compareRankedCandidates(a: RankedCandidate, b: RankedCandidate): number {
  const angleOrder = a.anglePenalty - b.anglePenalty;
  if (angleOrder !== 0) {
    return angleOrder;
  }

  const distanceOrder = a.distance - b.distance;
  if (distanceOrder !== 0) {
    return distanceOrder;
  }

  return a.node.node.path.localeCompare(b.node.node.path, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}
