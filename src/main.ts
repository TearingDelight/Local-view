import { Plugin, type TAbstractFile, type TFile, type WorkspaceLeaf } from "obsidian";
import { LOCAL_VIEW_TYPE } from "./constants";
import { NeighborhoodBuilder } from "./graph/NeighborhoodBuilder";
import { ObsidianLinkGraphSource } from "./graph/ObsidianLinkGraphSource";
import { isMarkdownFile } from "./graph/types";
import { ClickInputAdapter } from "./input/ClickInputAdapter";
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

export default class LocalViewPlugin extends Plugin implements LocalViewSettingsHost {
  settings: LocalViewSettings = DEFAULT_SETTINGS;
  private graphSource!: ObsidianLinkGraphSource;
  private neighborhoodBuilder!: NeighborhoodBuilder;
  private layoutEngine!: RadialLayoutEngine;
  private inputAdapter!: ClickInputAdapter;
  private navigationController!: NavigationController;
  private refreshTimer: number | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.graphSource = new ObsidianLinkGraphSource(this.app);
    this.neighborhoodBuilder = new NeighborhoodBuilder(this.graphSource);
    this.layoutEngine = new RadialLayoutEngine();
    this.inputAdapter = new ClickInputAdapter();
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

    this.addCommand({
      id: "open-local-view",
      name: "Open local view",
      callback: () => {
        void this.activateView();
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

    this.addSettingTab(new LocalViewSettingTab(this.app, this));

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

  async activateView(): Promise<void> {
    let leaf: WorkspaceLeaf | null = this.app.workspace.getLeavesOfType(LOCAL_VIEW_TYPE)[0] ?? null;

    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf("tab");
      await leaf.setViewState({
        type: LOCAL_VIEW_TYPE,
        active: true
      });
    }

    this.app.workspace.revealLeaf(leaf);
    await this.focusActiveFile();
    this.scheduleRefreshViews();
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

  private async handleActiveLeafChange(): Promise<void> {
    if (!this.settings.followActiveNote) {
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

