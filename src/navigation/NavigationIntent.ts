import type { NodeId } from "../graph/types";

export type NavigationIntent =
  | { type: "move-to"; nodeId: NodeId }
  | { type: "back" }
  | { type: "select-previous" }
  | { type: "select-next" }
  | { type: "enter-selected" };

export type NavigationOrigin = "internal" | "external";
