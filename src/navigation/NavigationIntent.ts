import type { NodeId } from "../graph/types";

export type NavigationDirection = "up" | "right" | "down" | "left";

export type NavigationIntent =
  | { type: "move-to"; nodeId: NodeId }
  | { type: "back" }
  | { type: "select-direction"; direction: NavigationDirection }
  | { type: "open-selected" };

export type NavigationOrigin = "internal" | "external";
