import { describe, expect, it } from "vitest";
import type { GraphSource } from "../src/graph/GraphSource";
import { NeighborhoodBuilder } from "../src/graph/NeighborhoodBuilder";
import { createLocalNode } from "../src/graph/types";
import { makeFile } from "./testUtils";

describe("NeighborhoodBuilder", () => {
  it("sorts neighbors deterministically and reports overflow", async () => {
    const center = makeFile("Center.md");
    const files = [makeFile("Zulu.md"), makeFile("Alpha.md"), makeFile("alpha/Alpha.md"), makeFile("Beta.md")];
    const graphSource: GraphSource = {
      async getOutgoingLinks() {
        return files.map((file) => createLocalNode(file, false));
      }
    };

    const builder = new NeighborhoodBuilder(graphSource);
    const neighborhood = await builder.build(center, 3);

    expect(neighborhood.center.path).toBe("Center.md");
    expect(neighborhood.neighbors.map((neighbor) => neighbor.node.path)).toEqual([
      "Alpha.md",
      "alpha/Alpha.md",
      "Beta.md"
    ]);
    expect(neighborhood.edges).toHaveLength(3);
    expect(neighborhood.overflowCount).toBe(1);
  });

  it("caches the latest neighborhood until invalidated", async () => {
    const center = makeFile("Center.md");
    let calls = 0;
    const graphSource: GraphSource = {
      async getOutgoingLinks() {
        calls += 1;
        return [];
      }
    };

    const builder = new NeighborhoodBuilder(graphSource);
    const first = await builder.build(center, 24);
    const second = await builder.build(center, 24);
    builder.invalidate(center.path);
    const third = await builder.build(center, 24);

    expect(first).toBe(second);
    expect(third).not.toBe(first);
    expect(calls).toBe(2);
  });
});

