import { App, PluginSettingTab, Setting, type Plugin } from "obsidian";
import {
  DEFAULT_VISIBLE_NEIGHBOR_LIMIT,
  MAX_VISIBLE_NEIGHBOR_LIMIT,
  MIN_VISIBLE_NEIGHBOR_LIMIT
} from "./constants";

export interface LocalViewSettings {
  followActiveNote: boolean;
  visibleNeighborLimit: number;
  openTargetsInActiveLeaf: boolean;
  showOverflowIndicator: boolean;
}

export const DEFAULT_SETTINGS: LocalViewSettings = {
  followActiveNote: true,
  visibleNeighborLimit: DEFAULT_VISIBLE_NEIGHBOR_LIMIT,
  openTargetsInActiveLeaf: true,
  showOverflowIndicator: true
};

export type LocalViewSettingsHost = Plugin & {
  settings: LocalViewSettings;
  updateSettings(settings: Partial<LocalViewSettings>): Promise<void>;
};

export function normalizeSettings(settings: Partial<LocalViewSettings>): LocalViewSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    visibleNeighborLimit: normalizeNeighborLimit(settings.visibleNeighborLimit)
  };
}

export function normalizeNeighborLimit(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_VISIBLE_NEIGHBOR_LIMIT;
  }

  return Math.min(MAX_VISIBLE_NEIGHBOR_LIMIT, Math.max(MIN_VISIBLE_NEIGHBOR_LIMIT, Math.floor(parsed)));
}

export class LocalViewSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly host: LocalViewSettingsHost) {
    super(app, host);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Local View" });

    new Setting(containerEl)
      .setName("Follow active note")
      .setDesc("Update the panel when the active markdown note changes outside Local View.")
      .addToggle((toggle) => {
        toggle.setValue(this.host.settings.followActiveNote);
        toggle.onChange((value) => this.host.updateSettings({ followActiveNote: value }));
      });

    new Setting(containerEl)
      .setName("Visible neighbor limit")
      .setDesc("Maximum outgoing wikilinks shown around the current note.")
      .addSlider((slider) => {
        slider
          .setLimits(MIN_VISIBLE_NEIGHBOR_LIMIT, MAX_VISIBLE_NEIGHBOR_LIMIT, 1)
          .setValue(this.host.settings.visibleNeighborLimit)
          .setDynamicTooltip()
          .onChange((value) => this.host.updateSettings({ visibleNeighborLimit: value }));
      });

    new Setting(containerEl)
      .setName("Open targets in active leaf")
      .setDesc("Use the active markdown leaf when possible; otherwise open a new tab.")
      .addToggle((toggle) => {
        toggle.setValue(this.host.settings.openTargetsInActiveLeaf);
        toggle.onChange((value) => this.host.updateSettings({ openTargetsInActiveLeaf: value }));
      });

    new Setting(containerEl)
      .setName("Show overflow indicator")
      .setDesc("Show a compact +N marker when the current note has more outgoing links than the limit.")
      .addToggle((toggle) => {
        toggle.setValue(this.host.settings.showOverflowIndicator);
        toggle.onChange((value) => this.host.updateSettings({ showOverflowIndicator: value }));
      });
  }
}

