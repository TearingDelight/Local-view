import { describe, expect, it } from "vitest";
import { createLocalNode, type LocalNeighborhood } from "../src/graph/types";
import { RadialLayoutEngine } from "../src/layout/RadialLayoutEngine";
import { makeFile } from "./testUtils";

describe("RadialLayoutEngine", () => {
  it("produces stable positions for the same neighborhood and bounds", () => {
    const center = createLocalNode(makeFile("Center.md"), true);
    const neighbors = ["A.md", "B.md", "C.md", "D.md"].map((path) => ({
      node: createLocalNode(makeFile(path), false),
      relationToCenter: "outgoing" as const,
      weight: 1
    }));
    const neighborhood: LocalNeighborhood = {
      center,
      neighbors,
      edges: neighbors.map((neighbor) => ({
        source: center.id,
        target: neighbor.node.id,
        direction: "outgoing",
        kind: "wikilink"
      })),
      overflowCount: 2,
      generatedAt: 1
    };
    const engine = new RadialLayoutEngine();

    const first = engine.layout(neighborhood, { width: 800, height: 600 });
    const second = engine.layout(neighborhood, { width: 800, height: 600 });

    expect(first.center).toEqual(second.center);
    expect(first.neighbors).toEqual(second.neighbors);
    expect(first.overflowIndicator).toEqual(second.overflowIndicator);
    expect(first.neighbors.map((node) => node.slot)).toEqual(["up", "right", "down", "left"]);
  });
});

