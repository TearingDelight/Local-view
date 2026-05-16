import type { NodeId } from "../graph/types";

export type NavigationIntent =
  | { type: "move-to"; nodeId: NodeId }
  | { type: "back" }
  | { type: "move-left" }
  | { type: "move-right" }
  | { type: "move-up" }
  | { type: "move-down" };

export type NavigationOrigin = "internal" | "external";

