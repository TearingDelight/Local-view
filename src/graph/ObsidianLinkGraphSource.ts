import type { App, LinkCache, TFile } from "obsidian";
import type { GraphSource } from "./GraphSource";
import { createLocalNode, isMarkdownFile, type LocalNode, type NodeId } from "./types";

export class ObsidianLinkGraphSource implements GraphSource {
  constructor(private readonly app: App) {}

  async getOutgoingLinks(file: TFile): Promise<LocalNode[]> {
    const fileCache = this.app.metadataCache.getFileCache(file);
    const links = fileCache?.links ?? [];
    const nodesByPath = new Map<NodeId, LocalNode>();

    for (const link of links) {
      const linkPath = getFileLevelLinkpath(link);
      if (!linkPath) {
        continue;
      }

      const destination = this.app.metadataCache.getFirstLinkpathDest(linkPath, file.path);
      if (!isMarkdownFile(destination) || destination.path === file.path) {
        continue;
      }

      if (!nodesByPath.has(destination.path)) {
        nodesByPath.set(destination.path, createLocalNode(destination, false));
      }
    }

    return Array.from(nodesByPath.values());
  }
}

export function getFileLevelLinkpath(link: Pick<LinkCache, "link">): string | null {
  const rawLink = link.link.trim();
  if (!rawLink || isBlockLink(rawLink)) {
    return null;
  }

  const subpathStart = rawLink.indexOf("#");
  if (subpathStart === -1) {
    return rawLink;
  }

  const filePath = rawLink.slice(0, subpathStart).trim();
  return filePath.length > 0 ? filePath : null;
}

function isBlockLink(rawLink: string): boolean {
  return rawLink.startsWith("^") || rawLink.includes("#^");
}

