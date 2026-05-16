import type { TFile } from "obsidian";
import type { GraphSource } from "./GraphSource";
import { createLocalNode, type LocalEdge, type LocalNeighborhood, type LocalNeighbor } from "./types";

interface NeighborhoodCacheEntry {
  centerPath: string;
  limit: number;
  neighborhood: LocalNeighborhood;
}

export class NeighborhoodBuilder {
  private cache: NeighborhoodCacheEntry | null = null;

  constructor(private readonly graphSource: GraphSource) {}

  async build(centerFile: TFile, visibleNeighborLimit: number): Promise<LocalNeighborhood> {
    const limit = Math.max(0, Math.floor(visibleNeighborLimit));
    if (this.cache?.centerPath === centerFile.path && this.cache.limit === limit) {
      return this.cache.neighborhood;
    }

    const center = createLocalNode(centerFile, true);
    const outgoingNodes = await this.graphSource.getOutgoingLinks(centerFile);
    const sortedNodes = outgoingNodes.sort(compareNodes);
    const visibleNodes = sortedNodes.slice(0, limit);
    const neighbors: LocalNeighbor[] = visibleNodes.map((node) => ({
      node,
      relationToCenter: "outgoing",
      weight: 1
    }));
    const edges: LocalEdge[] = visibleNodes.map((node) => ({
      source: center.id,
      target: node.id,
      direction: "outgoing",
      kind: "wikilink"
    }));

    const neighborhood: LocalNeighborhood = {
      center,
      neighbors,
      edges,
      overflowCount: Math.max(0, sortedNodes.length - visibleNodes.length),
      generatedAt: Date.now()
    };

    this.cache = {
      centerPath: centerFile.path,
      limit,
      neighborhood
    };

    return neighborhood;
  }

  invalidate(filePath?: string): void {
    if (!filePath || this.cache?.centerPath === filePath) {
      this.cache = null;
    }
  }

  invalidateAll(): void {
    this.cache = null;
  }
}

function compareNodes(a: { title: string; path: string }, b: { title: string; path: string }): number {
  const titleOrder = a.title.localeCompare(b.title, undefined, {
    numeric: true,
    sensitivity: "base"
  });

  if (titleOrder !== 0) {
    return titleOrder;
  }

  return a.path.localeCompare(b.path, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

