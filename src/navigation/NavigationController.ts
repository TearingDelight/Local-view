import type { App, TFile, WorkspaceLeaf } from "obsidian";
import { isMarkdownFile, type NodeId } from "../graph/types";
import type { PositionedNeighborhood } from "../layout/LayoutEngine";
import type { LocalViewSettings } from "../settings";
import { RingSelectionResolver, type RingSelectionStep } from "./RingSelectionResolver";
import type { NavigationOrigin } from "./NavigationIntent";

export interface NavigationState {
  currentNodeId: NodeId | null;
  selectedNodeId: NodeId | null;
  history: NavigationHistoryEntry[];
  pendingInternalOpen: NodeId | null;
}

export interface NavigationHistoryEntry {
  nodeId: NodeId;
  selectedNodeId: NodeId | null;
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
  private readonly ringSelectionResolver = new RingSelectionResolver();
  private readonly listeners = new Set<NavigationChangeListener>();
  private selectionScene: PositionedNeighborhood | null = null;
  private suppressedFileOpen: NodeId | null = null;
  private state: NavigationState = {
    currentNodeId: null,
    selectedNodeId: null,
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

  canEnterSelected(): boolean {
    return this.state.selectedNodeId !== null;
  }

  setSelectionScene(scene: PositionedNeighborhood | null): void {
    this.selectionScene = scene;
    this.state.selectedNodeId = this.ringSelectionResolver.ensureVisibleSelection(
      scene,
      this.state.selectedNodeId
    );
  }

  async moveTo(nodeId: NodeId): Promise<void> {
    if (this.state.currentNodeId === nodeId) {
      return;
    }

    await this.openTarget(nodeId, true);
  }

  enterNode(nodeId: NodeId): void {
    this.moveToLocal(nodeId);
  }

  async openNode(nodeId: NodeId): Promise<void> {
    await this.openFileWithoutMovingLocalView(nodeId);
  }

  selectPrevious(): void {
    this.selectByRingStep("previous");
  }

  selectNext(): void {
    this.selectByRingStep("next");
  }

  async enterSelected(): Promise<void> {
    if (!this.state.selectedNodeId) {
      return;
    }

    this.moveToLocal(this.state.selectedNodeId);
  }

  async openSelected(): Promise<void> {
    if (!this.state.selectedNodeId) {
      return;
    }

    await this.openFileWithoutMovingLocalView(this.state.selectedNodeId);
  }

  async goBack(): Promise<void> {
    const previousEntry = this.state.history.pop();
    if (!previousEntry) {
      return;
    }

    this.state.pendingInternalOpen = null;
    this.state.currentNodeId = previousEntry.nodeId;
    this.state.selectedNodeId = previousEntry.selectedNodeId;
    this.emit("internal");
  }

  async moveLeft(): Promise<void> {
    this.selectPrevious();
  }

  async moveRight(): Promise<void> {
    this.selectNext();
  }

  async moveUp(): Promise<void> {
    await this.enterSelected();
  }

  async moveDown(): Promise<void> {
    await this.goBack();
  }

  async setCurrentFromWorkspace(file: TFile): Promise<void> {
    if (!isMarkdownFile(file) || this.state.currentNodeId === file.path) {
      return;
    }

    this.state.pendingInternalOpen = null;
    this.state.currentNodeId = file.path;
    this.state.selectedNodeId = null;
    this.emit("external");
  }

  async handleFileOpen(file: TFile | null): Promise<NavigationOrigin | "ignored"> {
    if (!file || !isMarkdownFile(file)) {
      return "ignored";
    }

    if (this.suppressedFileOpen === file.path) {
      this.suppressedFileOpen = null;
      return "ignored";
    }

    if (this.state.pendingInternalOpen === file.path) {
      this.state.pendingInternalOpen = null;
      this.state.currentNodeId = file.path;
      this.state.selectedNodeId = null;
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

    if (this.state.selectedNodeId === oldPath) {
      this.state.selectedNodeId = file.path;
      changed = true;
    }

    const historyBefore = serializeHistory(this.state.history);
    this.state.history = this.state.history.map((entry) => ({
      nodeId: entry.nodeId === oldPath ? file.path : entry.nodeId,
      selectedNodeId: entry.selectedNodeId === oldPath ? file.path : entry.selectedNodeId
    }));
    changed = changed || historyBefore !== serializeHistory(this.state.history);

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
      this.state.history.push({
        nodeId: previousNodeId,
        selectedNodeId: targetFile.path
      });
    }

    this.state.selectedNodeId = null;
    this.state.pendingInternalOpen = targetFile.path;
    await this.openFile(targetFile);

    if (this.state.pendingInternalOpen === targetFile.path) {
      this.state.pendingInternalOpen = null;
      this.state.currentNodeId = targetFile.path;
      this.state.selectedNodeId = null;
      this.emit("internal");
    }
  }

  private moveToLocal(nodeId: NodeId): void {
    const targetFile = this.app.vault.getAbstractFileByPath(nodeId);
    if (!isMarkdownFile(targetFile) || this.state.currentNodeId === targetFile.path) {
      return;
    }

    const previousNodeId = this.state.currentNodeId;
    if (previousNodeId) {
      this.state.history.push({
        nodeId: previousNodeId,
        selectedNodeId: targetFile.path
      });
    }

    this.state.pendingInternalOpen = null;
    this.state.currentNodeId = targetFile.path;
    this.state.selectedNodeId = null;
    this.emit("internal");
  }

  private async openFileInWorkspace(file: TFile): Promise<void> {
    const leaf = this.getTargetLeaf();
    await leaf.openFile(file);
  }

  private async openFileWithoutMovingLocalView(nodeId: NodeId): Promise<void> {
    const targetFile = this.app.vault.getAbstractFileByPath(nodeId);
    if (!isMarkdownFile(targetFile)) {
      return;
    }

    this.suppressedFileOpen = targetFile.path;
    await this.openFile(targetFile);

    if (this.suppressedFileOpen === targetFile.path) {
      this.suppressedFileOpen = null;
    }
  }

  private selectByRingStep(step: RingSelectionStep): void {
    if (!this.selectionScene) {
      return;
    }

    const selectedNodeId = this.ringSelectionResolver.resolve(
      this.selectionScene,
      step,
      this.state.selectedNodeId
    );

    if (!selectedNodeId || selectedNodeId === this.state.selectedNodeId) {
      return;
    }

    this.state.selectedNodeId = selectedNodeId;
    this.emit("internal");
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
    const previousSelected = this.state.selectedNodeId;
    const previousPending = this.state.pendingInternalOpen;
    const previousHistory = serializeHistory(this.state.history);

    if (this.state.currentNodeId === nodeId) {
      this.state.currentNodeId = null;
    }

    if (this.state.selectedNodeId === nodeId) {
      this.state.selectedNodeId = null;
    }

    if (this.state.pendingInternalOpen === nodeId) {
      this.state.pendingInternalOpen = null;
    }

    this.state.history = this.state.history
      .filter((entry) => entry.nodeId !== nodeId)
      .map((entry) => ({
        nodeId: entry.nodeId,
        selectedNodeId: entry.selectedNodeId === nodeId ? null : entry.selectedNodeId
      }));

    return (
      previousCurrent !== this.state.currentNodeId ||
      previousSelected !== this.state.selectedNodeId ||
      previousPending !== this.state.pendingInternalOpen ||
      previousHistory !== serializeHistory(this.state.history)
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
    selectedNodeId: state.selectedNodeId,
    history: state.history.map((entry) => ({ ...entry })),
    pendingInternalOpen: state.pendingInternalOpen
  };
}

function serializeHistory(history: NavigationHistoryEntry[]): string {
  return history.map((entry) => `${entry.nodeId}\0${entry.selectedNodeId ?? ""}`).join("\n");
}
