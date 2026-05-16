import type { TFile } from "obsidian";

export type NodeId = string;

export interface LocalNode {
  id: NodeId;
  path: string;
  title: string;
  file: TFile;
  isCenter: boolean;
}

export interface LocalEdge {
  source: NodeId;
  target: NodeId;
  direction: "outgoing";
  kind: "wikilink";
}

export interface LocalNeighbor {
  node: LocalNode;
  relationToCenter: "outgoing";
  weight: number;
}

export interface LocalNeighborhood {
  center: LocalNode;
  neighbors: LocalNeighbor[];
  edges: LocalEdge[];
  overflowCount: number;
  generatedAt: number;
}

export function createLocalNode(file: TFile, isCenter: boolean): LocalNode {
  return {
    id: file.path,
    path: file.path,
    title: file.basename || stripMarkdownExtension(file.name),
    file,
    isCenter
  };
}

export function isMarkdownFile(file: unknown): file is TFile {
  if (!file || typeof file !== "object") {
    return false;
  }

  const candidate = file as { extension?: unknown; path?: unknown };
  return candidate.extension === "md" && typeof candidate.path === "string";
}

function stripMarkdownExtension(name: string): string {
  return name.endsWith(".md") ? name.slice(0, -3) : name;
}

