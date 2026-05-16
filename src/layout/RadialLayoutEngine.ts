import type { LocalNeighborhood } from "../graph/types";
import {
  type DirectionalSlot,
  type LayoutBounds,
  type LayoutEngine,
  type LayoutOptions,
  type PositionedNeighborhood,
  type PositionedNode
} from "./LayoutEngine";

const MIN_RADIUS = 96;
const NODE_SAFE_MARGIN = 84;
const OVERFLOW_ANGLE = Math.PI / 4;
const FAN_START_ANGLE = (-150 * Math.PI) / 180;
const FAN_END_ANGLE = (-30 * Math.PI) / 180;
const FAN_OVERFLOW_ANGLE = (-10 * Math.PI) / 180;

export class RadialLayoutEngine implements LayoutEngine {
  layout(
    neighborhood: LocalNeighborhood,
    bounds: LayoutBounds,
    options: Partial<LayoutOptions> = {}
  ): PositionedNeighborhood {
    const width = Math.max(bounds.width, 320);
    const height = Math.max(bounds.height, 260);
    const centerX = width / 2;
    const mode = options.mode ?? "ring";
    const centerY = mode === "fan" ? height * 0.68 : height / 2;
    const radius = Math.max(MIN_RADIUS, Math.min(width, height) / 2 - NODE_SAFE_MARGIN);
    const center: PositionedNode = {
      node: neighborhood.center,
      x: centerX,
      y: centerY,
      slot: "center"
    };

    const neighborCount = neighborhood.neighbors.length;
    const neighbors = neighborhood.neighbors.map((neighbor, index): PositionedNode => {
      const angle = mode === "fan" ? fanAngle(index, neighborCount) : ringAngle(index, neighborCount);
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
            x: centerX + Math.cos(mode === "fan" ? FAN_OVERFLOW_ANGLE : OVERFLOW_ANGLE) * radius,
            y: centerY + Math.sin(mode === "fan" ? FAN_OVERFLOW_ANGLE : OVERFLOW_ANGLE) * radius
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

function ringAngle(index: number, count: number): number {
  return -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(count, 1);
}

function fanAngle(index: number, count: number): number {
  if (count <= 1) {
    return -Math.PI / 2;
  }

  return FAN_START_ANGLE + ((FAN_END_ANGLE - FAN_START_ANGLE) * index) / (count - 1);
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
