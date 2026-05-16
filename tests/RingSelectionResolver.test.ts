import { describe, expect, it } from "vitest";
import { createLocalNode } from "../src/graph/types";
import type { PositionedNeighborhood, PositionedNode } from "../src/layout/LayoutEngine";
import { RingSelectionResolver } from "../src/navigation/RingSelectionResolver";
import { makeFile } from "./testUtils";

describe("RingSelectionResolver", () => {
  it("selects the first visible neighbor by default", () => {
    const scene = makeScene(["A.md", "B.md", "C.md"]);
    const resolver = new RingSelectionResolver();

    expect(resolver.getInitialSelection(scene)).toBe("A.md");
    expect(resolver.ensureVisibleSelection(scene, null)).toBe("A.md");
  });

  it("cycles through all visible neighbors clockwise and counterclockwise", () => {
    const scene = makeScene(["A.md", "B.md", "C.md"]);
    const resolver = new RingSelectionResolver();

    expect(resolver.resolve(scene, "next", "A.md")).toBe("B.md");
    expect(resolver.resolve(scene, "next", "C.md")).toBe("A.md");
    expect(resolver.resolve(scene, "previous", "A.md")).toBe("C.md");
    expect(resolver.resolve(scene, "previous", "C.md")).toBe("B.md");
  });

  it("falls back to the first visible neighbor when selection is missing", () => {
    const scene = makeScene(["A.md", "B.md"]);
    const resolver = new RingSelectionResolver();

    expect(resolver.resolve(scene, "next", null)).toBe("A.md");
    expect(resolver.ensureVisibleSelection(scene, "Missing.md")).toBe("A.md");
  });
});

function makeScene(paths: string[]): PositionedNeighborhood {
  const center = makePositionedNode("Center.md", true);
  const neighbors = paths.map((path) => makePositionedNode(path, false));

  return {
    center,
    neighbors,
    edges: neighbors.map((node) => ({
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

function makePositionedNode(path: string, isCenter: boolean): PositionedNode {
  return {
    node: createLocalNode(makeFile(path), isCenter),
    x: 0,
    y: 0,
    slot: isCenter ? "center" : "right"
  };
}
