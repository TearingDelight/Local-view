import { ItemView, setIcon, type App, type WorkspaceLeaf } from "obsidian";
import { LOCAL_VIEW_DISPLAY_NAME, LOCAL_VIEW_TYPE } from "../constants";
import type { NeighborhoodBuilder } from "../graph/NeighborhoodBuilder";
import type { InputAdapter } from "../input/InputAdapter";
import type { LayoutEngine } from "../layout/LayoutEngine";
import type { NavigationController } from "../navigation/NavigationController";
import type { NavigationIntent } from "../navigation/NavigationIntent";
import type { LocalViewSettings } from "../settings";
import { renderError, renderLocalScene, renderNoCurrentFile, type ViewportOffset } from "./renderLocalScene";

export interface LocalViewServices {
  app: App;
  navigationController: NavigationController;
  neighborhoodBuilder: NeighborhoodBuilder;
  layoutEngine: LayoutEngine;
  inputAdapter: InputAdapter;
  getSettings: () => LocalViewSettings;
  focusActiveFile: () => Promise<void>;
}

interface PanState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startOffset: ViewportOffset;
  startTime: number;
  moved: boolean;
  captured: boolean;
}

const MIN_DISTANCE_SCALE = 0.5;
const MAX_DISTANCE_SCALE = 8;
const PAN_START_THRESHOLD = 3;
const LONG_PRESS_SUPPRESS_CLICK_MS = 350;

export class LocalView extends ItemView {
  private viewportEl: HTMLElement | null = null;
  private backButtonEl: HTMLButtonElement | null = null;
  private inputUnmount: (() => void) | null = null;
  private navigationUnmount: (() => void) | null = null;
  private viewportInteractionUnmount: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private refreshTimer: number | null = null;
  private distanceScale = 1;
  private viewportOffset: ViewportOffset = { x: 0, y: 0 };
  private panState: PanState | null = null;
  private suppressNextClick = false;

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
    this.viewportInteractionUnmount = this.mountViewportInteractions(this.viewportEl);

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
    this.viewportInteractionUnmount?.();
    this.viewportInteractionUnmount = null;
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
        distanceScale: this.distanceScale,
        mode: settings.layoutMode
      });

      this.services.navigationController.setSelectionScene(scene);
      renderLocalScene(this.viewportEl, scene, {
        selectedNodeId: this.services.navigationController.getState().selectedNodeId,
        showOverflowIndicator: settings.showOverflowIndicator,
        viewportOffset: this.viewportOffset
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
      case "enter-node":
        this.services.navigationController.enterNode(intent.nodeId);
        return;
      case "open-node":
        await this.services.navigationController.openNode(intent.nodeId);
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

  private mountViewportInteractions(viewportEl: HTMLElement): () => void {
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomFactor = Math.exp(-event.deltaY * 0.001);
      this.distanceScale = clamp(this.distanceScale * zoomFactor, MIN_DISTANCE_SCALE, MAX_DISTANCE_SCALE);
      this.scheduleRefresh();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      this.panState = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startOffset: { ...this.viewportOffset },
        startTime: Date.now(),
        moved: false,
        captured: false
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!this.panState || this.panState.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - this.panState.startClientX;
      const deltaY = event.clientY - this.panState.startClientY;
      if (!this.panState.moved && Math.hypot(deltaX, deltaY) < PAN_START_THRESHOLD) {
        return;
      }

      event.preventDefault();
      this.panState.moved = true;
      if (!this.panState.captured) {
        viewportEl.setPointerCapture(event.pointerId);
        this.panState.captured = true;
      }
      viewportEl.classList.add("is-panning");
      this.viewportOffset = {
        x: this.panState.startOffset.x + deltaX,
        y: this.panState.startOffset.y + deltaY
      };
      this.scheduleRefresh();
    };

    const endPan = (event: PointerEvent) => {
      if (!this.panState || this.panState.pointerId !== event.pointerId) {
        return;
      }

      const wasLongPress = Date.now() - this.panState.startTime >= LONG_PRESS_SUPPRESS_CLICK_MS;
      if (this.panState.moved || wasLongPress) {
        this.suppressNextClick = true;
        window.setTimeout(() => {
          this.suppressNextClick = false;
        }, 0);
      }

      if (this.panState.captured && viewportEl.hasPointerCapture(event.pointerId)) {
        viewportEl.releasePointerCapture(event.pointerId);
      }
      viewportEl.classList.remove("is-panning");
      this.panState = null;
    };

    const handleClick = (event: MouseEvent) => {
      if (!this.suppressNextClick) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.suppressNextClick = false;
    };

    viewportEl.addEventListener("wheel", handleWheel, { passive: false });
    viewportEl.addEventListener("pointerdown", handlePointerDown);
    viewportEl.addEventListener("pointermove", handlePointerMove);
    viewportEl.addEventListener("pointerup", endPan);
    viewportEl.addEventListener("pointercancel", endPan);
    viewportEl.addEventListener("click", handleClick, true);

    return () => {
      viewportEl.removeEventListener("wheel", handleWheel);
      viewportEl.removeEventListener("pointerdown", handlePointerDown);
      viewportEl.removeEventListener("pointermove", handlePointerMove);
      viewportEl.removeEventListener("pointerup", endPan);
      viewportEl.removeEventListener("pointercancel", endPan);
      viewportEl.removeEventListener("click", handleClick, true);
      viewportEl.classList.remove("is-panning");
      this.panState = null;
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
