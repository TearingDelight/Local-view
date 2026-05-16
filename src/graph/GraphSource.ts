import type { TFile } from "obsidian";
import type { LocalNode } from "./types";

export interface GraphSource {
  getOutgoingLinks(file: TFile): Promise<LocalNode[]>;
}

