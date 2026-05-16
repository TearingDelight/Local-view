import { Plugin, type Menu, type TAbstractFile, type TFile, type WorkspaceLeaf } from "obsidian";
import { LOCAL_VIEW_TYPE } from "./constants";
import { NeighborhoodBuilder } from "./graph/NeighborhoodBuilder";
import { ObsidianLinkGraphSource } from "./graph/ObsidianLinkGraphSource";
import { isMarkdownFile } from "./graph/types";
import { ClickInputAdapter } from "./input/ClickInputAdapter";
import { CompositeInputAdapter } from "./input/CompositeInputAdapter";
import type { InputAdapter } from "./input/InputAdapter";
import { KeyboardInputAdapter } from "./input/KeyboardInputAdapter";
import { RadialLayoutEngine } from "./layout/RadialLayoutEngine";
import { NavigationController } from "./navigation/NavigationController";
import {
  DEFAULT_SETTINGS,
  LocalViewSettingTab,
  normalizeSettings,
  type LocalViewSettings,
  type LocalViewSettingsHost
} from "./settings";
import { LocalView } from "./view/LocalView";

type LocalViewOpenMode = "tab" | "sidebar";
interface LocalViewActivationOptions {
  centerFile?: TFile;
}

export default class LocalViewPlugin extends Plugin implements LocalViewSettingsHost {
  settings: LocalViewSettings = DEFAULT_SETTINGS;
  private graphSource!: ObsidianLinkGraphSource;
  private neighborhoodBuilder!: NeighborhoodBuilder;
  private layoutEngine!: RadialLayoutEngine;
  private inputAdapter!: InputAdapter;
  private navigationController!: NavigationController;
  private refreshTimer: number | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.graphSource = new ObsidianLinkGraphSource(this.app);
    this.neighborhoodBuilder = new NeighborhoodBuilder(this.graphSource);
    this.layoutEngine = new RadialLayoutEngine();
    this.inputAdapter = new CompositeInputAdapter([new ClickInputAdapter(), new KeyboardInputAdapter()]);
    this.navigationController = new NavigationController({
      app: this.app,
      getSettings: () => this.settings
    });

    this.registerView(
      LOCAL_VIEW_TYPE,
      (leaf) =>
        new LocalView(leaf, {
          app: this.app,
          navigationController: this.navigationController,
          neighborhoodBuilder: this.neighborhoodBuilder,
          layoutEngine: this.layoutEngine,
          inputAdapter: this.inputAdapter,
          getSettings: () => this.settings,
          focusActiveFile: () => this.focusActiveFile()
        })
    );

    this.addRibbonIcon("orbit", "Open Local View", () => {
      void this.activateView("tab");
    });

    this.addCommand({
      id: "open-local-view",
      name: "Open local view",
      callback: () => {
        void this.activateView("tab");
      }
    });

    this.addCommand({
      id: "open-local-view-sidebar",
      name: "Open local view in right sidebar",
      callback: () => {
        void this.activateView("sidebar");
      }
    });

    this.addCommand({
      id: "focus-current-note",
      name: "Focus current note",
      callback: () => {
        void this.focusActiveFile();
      }
    });

    this.addCommand({
      id: "go-back",
      name: "Go back",
      callback: () => {
        void this.navigationController.goBack();
      }
    });

    this.addCommand({
      id: "select-previous-note",
      name: "Select previous linked note",
      callback: () => {
        this.selectPreviousFromCommand();
      }
    });

    this.addCommand({
      id: "select-next-note",
      name: "Select next linked note",
      callback: () => {
        this.selectNextFromCommand();
      }
    });

    this.addCommand({
      id: "enter-selected-note",
      name: "Move to selected linked note",
      callback: () => {
        void this.enterSelectedFromCommand();
      }
    });

    this.addCommand({
      id: "open-selected-note",
      name: "Open selected linked note",
      callback: () => {
        void this.openSelectedFromCommand();
      }
    });

    this.addSettingTab(new LocalViewSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        this.addOpenLocalViewFileMenuItem(menu, file);
      })
    );

    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        void this.navigationController.handleFileOpen(file);
      })
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        void this.handleActiveLeafChange();
      })
    );

    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        this.handleMetadataChanged(file);
      })
    );

    this.registerEvent(
      this.app.metadataCache.on("deleted", (file) => {
        this.handleDeletedFile(file);
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.handleRenamedFile(file, oldPath);
      })
    );
  }

  onunload(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    void this.app.workspace.detachLeavesOfType(LOCAL_VIEW_TYPE);
  }

  async updateSettings(settings: Partial<LocalViewSettings>): Promise<void> {
    this.settings = normalizeSettings({
      ...this.settings,
      ...settings
    });
    await this.saveSettings();
    this.neighborhoodBuilder.invalidateAll();
    this.scheduleRefreshViews();
  }

  async activateView(
    mode: LocalViewOpenMode = "tab",
    options: LocalViewActivationOptions = {}
  ): Promise<void> {
    let leaf: WorkspaceLeaf | null = this.getExistingLocalViewLeaf(mode);

    if (!leaf) {
      leaf = this.getLocalViewLeaf(mode);
      await leaf.setViewState({
        type: LOCAL_VIEW_TYPE,
        active: true
      });
    }

    this.app.workspace.revealLeaf(leaf);
    if (options.centerFile) {
      await this.navigationController.setCurrentFromWorkspace(options.centerFile);
    } else {
      await this.focusActiveFile();
    }
    this.scheduleRefreshViews();
    if (leaf.view instanceof LocalView) {
      leaf.view.focusForKeyboard();
    }
  }

  private getExistingLocalViewLeaf(mode: LocalViewOpenMode): WorkspaceLeaf | null {
    if (mode === "tab") {
      let rootLeaf: WorkspaceLeaf | null = null;
      this.app.workspace.iterateRootLeaves((leaf) => {
        if (!rootLeaf && leaf.view.getViewType() === LOCAL_VIEW_TYPE) {
          rootLeaf = leaf;
        }
      });
      return rootLeaf;
    }

    return (
      this.app.workspace
        .getLeavesOfType(LOCAL_VIEW_TYPE)
        .find((leaf) => leaf.getRoot() !== this.app.workspace.rootSplit) ?? null
    );
  }

  private getLocalViewLeaf(mode: LocalViewOpenMode): WorkspaceLeaf {
    if (mode === "sidebar") {
      return this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf("tab");
    }

    return this.app.workspace.getLeaf("tab");
  }

  async focusActiveFile(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile && isMarkdownFile(activeFile)) {
      await this.navigationController.setCurrentFromWorkspace(activeFile);
    }
  }

  private async loadSettings(): Promise<void> {
    this.settings = normalizeSettings((await this.loadData()) ?? {});
  }

  private async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private addOpenLocalViewFileMenuItem(menu: Menu, file: TAbstractFile): void {
    if (!isMarkdownFile(file)) {
      return;
    }

    menu.addItem((item) => {
      item
        .setTitle("Open local view")
        .setIcon("orbit")
        .onClick(() => {
          void this.activateView("tab", { centerFile: file });
        });
    });
  }

  private async handleActiveLeafChange(): Promise<void> {
    if (!this.settings.followActiveNote) {
      return;
    }

    if (this.app.workspace.activeLeaf?.view.getViewType() === LOCAL_VIEW_TYPE) {
      return;
    }

    await this.focusActiveFile();
  }

  private handleMetadataChanged(file: TFile): void {
    if (file.path !== this.navigationController.getCurrentNodeId()) {
      return;
    }

    this.neighborhoodBuilder.invalidate(file.path);
    this.scheduleRefreshViews();
  }

  private handleDeletedFile(file: TFile): void {
    if (!isMarkdownFile(file)) {
      return;
    }

    this.neighborhoodBuilder.invalidateAll();
    this.navigationController.handleDeletedFile(file);
    this.scheduleRefreshViews();
  }

  private handleRenamedFile(file: TAbstractFile, oldPath: string): void {
    if (!isMarkdownFile(file)) {
      return;
    }

    this.neighborhoodBuilder.invalidateAll();
    this.navigationController.handleRenamedFile(file, oldPath);
    this.scheduleRefreshViews();
  }

  private selectPreviousFromCommand(): void {
    if (!this.hasFocusedLocalView()) {
      return;
    }

    this.navigationController.selectPrevious();
  }

  private selectNextFromCommand(): void {
    if (!this.hasFocusedLocalView()) {
      return;
    }

    this.navigationController.selectNext();
  }

  private async enterSelectedFromCommand(): Promise<void> {
    if (!this.hasFocusedLocalView()) {
      return;
    }

    await this.navigationController.enterSelected();
  }

  private async openSelectedFromCommand(): Promise<void> {
    if (!this.hasFocusedLocalView()) {
      return;
    }

    await this.navigationController.openSelected();
  }

  private hasFocusedLocalView(): boolean {
    return this.app.workspace
      .getLeavesOfType(LOCAL_VIEW_TYPE)
      .some((leaf) => leaf.view instanceof LocalView && leaf.view.hasFocusWithin());
  }

  private scheduleRefreshViews(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      for (const leaf of this.app.workspace.getLeavesOfType(LOCAL_VIEW_TYPE)) {
        if (leaf.view instanceof LocalView) {
          void leaf.view.refresh();
        }
      }
    }, 50);
  }
}
