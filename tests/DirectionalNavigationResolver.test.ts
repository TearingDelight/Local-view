import { describe, expect, it } from "vitest";
import { createLocalNode } from "../src/graph/types";
import type { PositionedNeighborhood, PositionedNode } from "../src/layout/LayoutEngine";
import { DirectionalNavigationResolver } from "../src/navigation/DirectionalNavigationResolver";
import { makeFile } from "./testUtils";

describe("DirectionalNavigationResolver", () => {
  it("selects the nearest candidate from the center by direction", () => {
    const scene = makeScene([
      ["Up.md", 0, -100],
      ["Right.md", 100, 0],
      ["Down.md", 0, 100],
      ["Left.md", -100, 0]
    ]);
    const resolver = new DirectionalNavigationResolver();

    expect(resolver.resolve(scene, "up", null)).toBe("Up.md");
    expect(resolver.resolve(scene, "right", null)).toBe("Right.md");
    expect(resolver.resolve(scene, "down", null)).toBe("Down.md");
    expect(resolver.resolve(scene, "left", null)).toBe("Left.md");
  });

  it("moves selection relative to the selected candidate", () => {
    const scene = makeScene([
      ["Up.md", 0, -100],
      ["Right.md", 100, 0],
      ["Down.md", 0, 100],
      ["Left.md", -100, 0]
    ]);
    const resolver = new DirectionalNavigationResolver();

    expect(resolver.resolve(scene, "right", "Up.md")).toBe("Right.md");
    expect(resolver.resolve(scene, "down", "Right.md")).toBe("Down.md");
    expect(resolver.resolve(scene, "right", "Right.md")).toBeNull();
  });

  it("uses path order as the deterministic final tie breaker", () => {
    const scene = makeScene([
      ["B.md", 100, -100],
      ["A.md", 100, 100]
    ]);
    const resolver = new DirectionalNavigationResolver();

    expect(resolver.resolve(scene, "right", null)).toBe("A.md");
  });
});

function makeScene(neighbors: Array<[path: string, x: number, y: number]>): PositionedNeighborhood {
  const center = makePositionedNode("Center.md", 0, 0, true);
  const positionedNeighbors = neighbors.map(([path, x, y]) => makePositionedNode(path, x, y, false));

  return {
    center,
    neighbors: positionedNeighbors,
    edges: positionedNeighbors.map((node) => ({
      source: center.node.id,
      target: node.node.id,
      direction: "outgoing",
      kind: "wikilink"
    })),
    overflowIndicator: null,
    bounds: { width: 300, height: 300 },
    radius: 100
  };
}

function makePositionedNode(path: string, x: number, y: number, isCenter: boolean): PositionedNode {
  return {
    node: createLocalNode(makeFile(path), isCenter),
    x,
    y,
    slot: isCenter ? "center" : "right"
  };
}
