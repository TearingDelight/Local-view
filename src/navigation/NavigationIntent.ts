import type { NodeId } from "../graph/types";

export type NavigationIntent =
  | { type: "move-to"; nodeId: NodeId }
  | { type: "enter-node"; nodeId: NodeId }
  | { type: "open-node"; nodeId: NodeId }
  | { type: "back" }
  | { type: "select-previous" }
  | { type: "select-next" }
  | { type: "enter-selected" }
  | { type: "open-selected" };

export type NavigationOrigin = "internal" | "external";
