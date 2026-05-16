import { ItemView, setIcon, type App, type WorkspaceLeaf } from "obsidian";
import { LOCAL_VIEW_DISPLAY_NAME, LOCAL_VIEW_TYPE } from "../constants";
import type { NeighborhoodBuilder } from "../graph/NeighborhoodBuilder";
import type { InputAdapter } from "../input/InputAdapter";
import type { LayoutEngine } from "../layout/LayoutEngine";
import type { NavigationController } from "../navigation/NavigationController";
import type { NavigationIntent } from "../navigation/NavigationIntent";
import type { LocalViewSettings } from "../settings";
import { renderError, renderLocalScene, renderNoCurrentFile } from "./renderLocalScene";

export interface LocalViewServices {
  app: App;
  navigationController: NavigationController;
  neighborhoodBuilder: NeighborhoodBuilder;
  layoutEngine: LayoutEngine;
  inputAdapter: InputAdapter;
  getSettings: () => LocalViewSettings;
  focusActiveFile: () => Promise<void>;
}

export class LocalView extends ItemView {
  private viewportEl: HTMLElement | null = null;
  private backButtonEl: HTMLButtonElement | null = null;
  private inputUnmount: (() => void) | null = null;
  private navigationUnmount: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private refreshTimer: number | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly services: LocalViewServices) {
    super(leaf);
  }

  getViewType(): string {
    return LOCAL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return LOCAL_VIEW_DISPLAY_NAME;
  }

  getIcon(): string {
    return "orbit";
  }

  async onOpen(): Promise<void> {
    this.contentEl.replaceChildren();
    this.contentEl.classList.add("local-view-root");
    this.contentEl.tabIndex = 0;

    const toolbarEl = document.createElement("div");
    toolbarEl.className = "local-view-toolbar";

    this.backButtonEl = document.createElement("button");
    this.backButtonEl.className = "clickable-icon local-view-toolbar-button";
    this.backButtonEl.type = "button";
    this.backButtonEl.dataset.localViewAction = "back";
    this.backButtonEl.setAttribute("aria-label", "Go back");
    this.backButtonEl.title = "Go back";
    setIcon(this.backButtonEl, "arrow-left");

    const titleEl = document.createElement("div");
    titleEl.className = "local-view-title";
    titleEl.textContent = LOCAL_VIEW_DISPLAY_NAME;

    toolbarEl.appendChild(this.backButtonEl);
    toolbarEl.appendChild(titleEl);

    this.viewportEl = document.createElement("div");
    this.viewportEl.className = "local-view-viewport";

    this.contentEl.appendChild(toolbarEl);
    this.contentEl.appendChild(this.viewportEl);

    this.inputUnmount = this.services.inputAdapter.mount(this.contentEl, (intent) => {
      void this.handleIntent(intent);
    });
    this.navigationUnmount = this.services.navigationController.onChange(() => this.scheduleRefresh());

    this.resizeObserver = new ResizeObserver(() => this.scheduleRefresh());
    this.resizeObserver.observe(this.viewportEl);

    await this.services.focusActiveFile();
    await this.refresh();
    this.focusForKeyboard();
  }

  async onClose(): Promise<void> {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.inputUnmount?.();
    this.inputUnmount = null;
    this.navigationUnmount?.();
    this.navigationUnmount = null;
  }

  scheduleRefresh(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, 50);
  }

  async refresh(): Promise<void> {
    if (!this.viewportEl) {
      return;
    }

    this.updateToolbar();

    const currentFile = this.services.navigationController.getCurrentFile();
    if (!currentFile) {
      this.services.navigationController.setSelectionScene(null);
      renderNoCurrentFile(this.viewportEl);
      return;
    }

    try {
      const settings = this.services.getSettings();
      const neighborhood = await this.services.neighborhoodBuilder.build(
        currentFile,
        settings.visibleNeighborLimit
      );
      const scene = this.services.layoutEngine.layout(neighborhood, {
        width: this.viewportEl.clientWidth || 640,
        height: this.viewportEl.clientHeight || 420
      }, {
        mode: settings.layoutMode
      });

      this.services.navigationController.setSelectionScene(scene);
      renderLocalScene(this.viewportEl, scene, {
        selectedNodeId: this.services.navigationController.getState().selectedNodeId,
        showOverflowIndicator: settings.showOverflowIndicator
      });
    } catch (error) {
      this.services.navigationController.setSelectionScene(null);
      const message = error instanceof Error ? error.message : "Unable to render Local View";
      renderError(this.viewportEl, message);
    }
  }

  focusForKeyboard(): void {
    this.contentEl.focus({ preventScroll: true });
    window.requestAnimationFrame(() => this.contentEl.focus({ preventScroll: true }));
  }

  hasFocusWithin(): boolean {
    const activeElement = document.activeElement;
    return activeElement instanceof Node && this.contentEl.contains(activeElement);
  }

  private updateToolbar(): void {
    if (!this.backButtonEl) {
      return;
    }

    this.backButtonEl.toggleAttribute("disabled", !this.services.navigationController.canGoBack());
  }

  private async handleIntent(intent: NavigationIntent): Promise<void> {
    switch (intent.type) {
      case "move-to":
        await this.services.navigationController.moveTo(intent.nodeId);
        return;
      case "back":
        await this.services.navigationController.goBack();
        return;
      case "select-previous":
        this.services.navigationController.selectPrevious();
        return;
      case "select-next":
        this.services.navigationController.selectNext();
        return;
      case "enter-selected":
        await this.services.navigationController.enterSelected();
        return;
      case "open-selected":
        await this.services.navigationController.openSelected();
        return;
    }
  }
}
