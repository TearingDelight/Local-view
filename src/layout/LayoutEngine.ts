import type { LocalEdge, LocalNeighborhood, LocalNode } from "../graph/types";
import type { LocalViewLayoutMode } from "../settings";

export type DirectionalSlot =
  | "center"
  | "up"
  | "upper-right"
  | "right"
  | "lower-right"
  | "down"
  | "lower-left"
  | "left"
  | "upper-left";

export interface LayoutBounds {
  width: number;
  height: number;
}

export interface LayoutOptions {
  mode: LocalViewLayoutMode;
}

export interface PositionedNode {
  node: LocalNode;
  x: number;
  y: number;
  slot: DirectionalSlot;
}

export interface OverflowIndicator {
  count: number;
  x: number;
  y: number;
}

export interface PositionedNeighborhood {
  center: PositionedNode;
  neighbors: PositionedNode[];
  edges: LocalEdge[];
  overflowIndicator: OverflowIndicator | null;
  bounds: LayoutBounds;
  radius: number;
}

export interface LayoutEngine {
  layout(neighborhood: LocalNeighborhood, bounds: LayoutBounds, options?: Partial<LayoutOptions>): PositionedNeighborhood;
}
