import type { App, TFile, WorkspaceLeaf } from "obsidian";
import { isMarkdownFile, type NodeId } from "../graph/types";
import type { LocalViewSettings } from "../settings";
import type { NavigationOrigin } from "./NavigationIntent";

export interface NavigationState {
  currentNodeId: NodeId | null;
  history: NodeId[];
  pendingInternalOpen: NodeId | null;
}

export interface NavigationControllerOptions {
  app: App;
  getSettings: () => LocalViewSettings;
  openFile?: (file: TFile) => Promise<void>;
}

export type NavigationChangeListener = (state: NavigationState, origin: NavigationOrigin) => void;

export class NavigationController {
  private readonly app: App;
  private readonly getSettings: () => LocalViewSettings;
  private readonly openFile: (file: TFile) => Promise<void>;
  private readonly listeners = new Set<NavigationChangeListener>();
  private state: NavigationState = {
    currentNodeId: null,
    history: [],
    pendingInternalOpen: null
  };

  constructor(options: NavigationControllerOptions) {
    this.app = options.app;
    this.getSettings = options.getSettings;
    this.openFile = options.openFile ?? ((file) => this.openFileInWorkspace(file));
  }

  onChange(listener: NavigationChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): NavigationState {
    return copyState(this.state);
  }

  getCurrentNodeId(): NodeId | null {
    return this.state.currentNodeId;
  }

  getCurrentFile(): TFile | null {
    if (!this.state.currentNodeId) {
      return null;
    }

    const file = this.app.vault.getAbstractFileByPath(this.state.currentNodeId);
    return isMarkdownFile(file) ? file : null;
  }

  canGoBack(): boolean {
    return this.state.history.length > 0;
  }

  async moveTo(nodeId: NodeId): Promise<void> {
    if (this.state.currentNodeId === nodeId) {
      return;
    }

    await this.openTarget(nodeId, true);
  }

  async goBack(): Promise<void> {
    const previousNodeId = this.state.history.pop();
    if (!previousNodeId) {
      return;
    }

    await this.openTarget(previousNodeId, false);
  }

  async moveLeft(): Promise<void> {
    return Promise.resolve();
  }

  async moveRight(): Promise<void> {
    return Promise.resolve();
  }

  async moveUp(): Promise<void> {
    return Promise.resolve();
  }

  async moveDown(): Promise<void> {
    return Promise.resolve();
  }

  async setCurrentFromWorkspace(file: TFile): Promise<void> {
    if (!isMarkdownFile(file) || this.state.currentNodeId === file.path) {
      return;
    }

    this.state.pendingInternalOpen = null;
    this.state.currentNodeId = file.path;
    this.emit("external");
  }

  async handleFileOpen(file: TFile | null): Promise<NavigationOrigin | "ignored"> {
    if (!file || !isMarkdownFile(file)) {
      return "ignored";
    }

    if (this.state.pendingInternalOpen === file.path) {
      this.state.pendingInternalOpen = null;
      this.state.currentNodeId = file.path;
      this.emit("internal");
      return "internal";
    }

    this.state.pendingInternalOpen = null;
    if (!this.getSettings().followActiveNote) {
      return "ignored";
    }

    await this.setCurrentFromWorkspace(file);
    return "external";
  }

  handleDeletedFile(file: TFile): void {
    const changed = this.removeNodeFromState(file.path);
    if (changed) {
      this.emit("external");
    }
  }

  handleRenamedFile(file: TFile, oldPath: string): void {
    if (!isMarkdownFile(file)) {
      return;
    }

    let changed = false;
    if (this.state.currentNodeId === oldPath) {
      this.state.currentNodeId = file.path;
      changed = true;
    }

    if (this.state.pendingInternalOpen === oldPath) {
      this.state.pendingInternalOpen = file.path;
      changed = true;
    }

    const historyBefore = this.state.history.join("\n");
    this.state.history = this.state.history.map((nodeId) => (nodeId === oldPath ? file.path : nodeId));
    changed = changed || historyBefore !== this.state.history.join("\n");

    if (changed) {
      this.emit("external");
    }
  }

  private async openTarget(nodeId: NodeId, pushCurrentToHistory: boolean): Promise<void> {
    const targetFile = this.app.vault.getAbstractFileByPath(nodeId);
    if (!isMarkdownFile(targetFile)) {
      return;
    }

    const previousNodeId = this.state.currentNodeId;
    if (pushCurrentToHistory && previousNodeId && previousNodeId !== targetFile.path) {
      this.state.history.push(previousNodeId);
    }

    this.state.pendingInternalOpen = targetFile.path;
    await this.openFile(targetFile);

    if (this.state.pendingInternalOpen === targetFile.path) {
      this.state.pendingInternalOpen = null;
      this.state.currentNodeId = targetFile.path;
      this.emit("internal");
    }
  }

  private async openFileInWorkspace(file: TFile): Promise<void> {
    const leaf = this.getTargetLeaf();
    await leaf.openFile(file);
  }

  private getTargetLeaf(): WorkspaceLeaf {
    const settings = this.getSettings();
    const activeLeaf = this.app.workspace.activeLeaf;

    if (settings.openTargetsInActiveLeaf && activeLeaf?.view.getViewType() === "markdown") {
      return activeLeaf;
    }

    if (settings.openTargetsInActiveLeaf) {
      const markdownLeaf = this.app.workspace.getLeavesOfType("markdown")[0];
      if (markdownLeaf) {
        return markdownLeaf;
      }
    }

    return this.app.workspace.getLeaf("tab");
  }

  private removeNodeFromState(nodeId: NodeId): boolean {
    const previousCurrent = this.state.currentNodeId;
    const previousPending = this.state.pendingInternalOpen;
    const previousHistoryLength = this.state.history.length;

    if (this.state.currentNodeId === nodeId) {
      this.state.currentNodeId = null;
    }

    if (this.state.pendingInternalOpen === nodeId) {
      this.state.pendingInternalOpen = null;
    }

    this.state.history = this.state.history.filter((historyNodeId) => historyNodeId !== nodeId);

    return (
      previousCurrent !== this.state.currentNodeId ||
      previousPending !== this.state.pendingInternalOpen ||
      previousHistoryLength !== this.state.history.length
    );
  }

  private emit(origin: NavigationOrigin): void {
    const state = copyState(this.state);
    for (const listener of this.listeners) {
      listener(state, origin);
    }
  }
}

function copyState(state: NavigationState): NavigationState {
  return {
    currentNodeId: state.currentNodeId,
    history: [...state.history],
    pendingInternalOpen: state.pendingInternalOpen
  };
}

