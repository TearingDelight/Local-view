import type { LocalNeighborhood } from "../graph/types";
import {
  type DirectionalSlot,
  type LayoutBounds,
  type LayoutEngine,
  type PositionedNeighborhood,
  type PositionedNode
} from "./LayoutEngine";

const MIN_RADIUS = 96;
const NODE_SAFE_MARGIN = 84;
const OVERFLOW_ANGLE = Math.PI / 4;

export class RadialLayoutEngine implements LayoutEngine {
  layout(neighborhood: LocalNeighborhood, bounds: LayoutBounds): PositionedNeighborhood {
    const width = Math.max(bounds.width, 320);
    const height = Math.max(bounds.height, 260);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.max(MIN_RADIUS, Math.min(width, height) / 2 - NODE_SAFE_MARGIN);
    const center: PositionedNode = {
      node: neighborhood.center,
      x: centerX,
      y: centerY,
      slot: "center"
    };

    const neighborCount = neighborhood.neighbors.length;
    const neighbors = neighborhood.neighbors.map((neighbor, index): PositionedNode => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(neighborCount, 1);
      return {
        node: neighbor.node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        slot: angleToSlot(angle)
      };
    });

    const overflowIndicator =
      neighborhood.overflowCount > 0
        ? {
            count: neighborhood.overflowCount,
            x: centerX + Math.cos(OVERFLOW_ANGLE) * radius,
            y: centerY + Math.sin(OVERFLOW_ANGLE) * radius
          }
        : null;

    return {
      center,
      neighbors,
      edges: neighborhood.edges,
      overflowIndicator,
      bounds: {
        width,
        height
      },
      radius
    };
  }
}

function angleToSlot(angle: number): DirectionalSlot {
  const degrees = normalizeDegrees((angle * 180) / Math.PI);
  if (degrees >= 337.5 || degrees < 22.5) {
    return "right";
  }
  if (degrees < 67.5) {
    return "lower-right";
  }
  if (degrees < 112.5) {
    return "down";
  }
  if (degrees < 157.5) {
    return "lower-left";
  }
  if (degrees < 202.5) {
    return "left";
  }
  if (degrees < 247.5) {
    return "upper-left";
  }
  if (degrees < 292.5) {
    return "up";
  }
  return "upper-right";
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

