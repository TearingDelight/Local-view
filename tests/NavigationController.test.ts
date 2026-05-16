import { describe, expect, it } from "vitest";
import type { TFile } from "obsidian";
import { createLocalNode } from "../src/graph/types";
import type { PositionedNeighborhood, PositionedNode } from "../src/layout/LayoutEngine";
import { NavigationController } from "../src/navigation/NavigationController";
import type { LocalViewSettings } from "../src/settings";
import { makeApp, makeFile } from "./testUtils";

const DEFAULT_TEST_SETTINGS: LocalViewSettings = {
  followActiveNote: true,
  visibleNeighborLimit: 24,
  openTargetsInActiveLeaf: true,
  showOverflowIndicator: true
};

describe("NavigationController", () => {
  it("tracks click navigation history and treats matching file-open as internal", async () => {
    const alpha = makeFile("Alpha.md");
    const beta = makeFile("Beta.md");
    const app = makeApp([alpha, beta]);
    const opened: TFile[] = [];
    let controller: NavigationController;
    controller = new NavigationController({
      app,
      getSettings: () => DEFAULT_TEST_SETTINGS,
      openFile: async (file) => {
        opened.push(file);
        await controller.handleFileOpen(file);
      }
    });

    await controller.setCurrentFromWorkspace(alpha);
    await controller.moveTo(beta.path);

    expect(opened.map((file) => file.path)).toEqual(["Beta.md"]);
    expect(controller.getState()).toEqual({
      currentNodeId: "Beta.md",
      selectedNodeId: null,
      history: ["Alpha.md"],
      pendingInternalOpen: null
    });

    await controller.goBack();

    expect(opened.map((file) => file.path)).toEqual(["Beta.md", "Alpha.md"]);
    expect(controller.getState()).toEqual({
      currentNodeId: "Alpha.md",
      selectedNodeId: null,
      history: [],
      pendingInternalOpen: null
    });
  });

  it("ignores external file-open events when follow active note is disabled", async () => {
    const alpha = makeFile("Alpha.md");
    const beta = makeFile("Beta.md");
    const app = makeApp([alpha, beta]);
    const settings: LocalViewSettings = {
      ...DEFAULT_TEST_SETTINGS,
      followActiveNote: false
    };
    const controller = new NavigationController({
      app,
      getSettings: () => settings,
      openFile: async () => undefined
    });

    await controller.setCurrentFromWorkspace(alpha);
    const origin = await controller.handleFileOpen(beta);

    expect(origin).toBe("ignored");
    expect(controller.getCurrentNodeId()).toBe("Alpha.md");
  });

  it("selects a directional neighbor before opening it", async () => {
    const alpha = makeFile("Alpha.md");
    const beta = makeFile("Beta.md");
    const app = makeApp([alpha, beta]);
    const opened: TFile[] = [];
    let controller: NavigationController;
    controller = new NavigationController({
      app,
      getSettings: () => DEFAULT_TEST_SETTINGS,
      openFile: async (file) => {
        opened.push(file);
        await controller.handleFileOpen(file);
      }
    });

    await controller.setCurrentFromWorkspace(alpha);
    controller.setDirectionalScene(makeScene(alpha, [[beta, 100, 0]]));
    controller.selectDirection("right");

    expect(opened).toEqual([]);
    expect(controller.getState()).toMatchObject({
      currentNodeId: "Alpha.md",
      selectedNodeId: "Beta.md",
      history: []
    });

    await controller.openSelected();

    expect(opened.map((file) => file.path)).toEqual(["Beta.md"]);
    expect(controller.getState()).toEqual({
      currentNodeId: "Beta.md",
      selectedNodeId: null,
      history: ["Alpha.md"],
      pendingInternalOpen: null
    });
  });
});

function makeScene(
  centerFile: TFile,
  neighbors: Array<[file: TFile, x: number, y: number]>
): PositionedNeighborhood {
  const center = makePositionedNode(centerFile, 0, 0, true);
  const positionedNeighbors = neighbors.map(([file, x, y]) => makePositionedNode(file, x, y, false));

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

function makePositionedNode(file: TFile, x: number, y: number, isCenter: boolean): PositionedNode {
  return {
    node: createLocalNode(file, isCenter),
    x,
    y,
    slot: isCenter ? "center" : "right"
  };
}
