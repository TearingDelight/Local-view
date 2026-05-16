import type { PositionedNeighborhood, PositionedNode } from "../layout/LayoutEngine";
import type { NodeId } from "../graph/types";

export interface RenderLocalSceneOptions {
  selectedNodeId: NodeId | null;
  showOverflowIndicator: boolean;
  viewportOffset: ViewportOffset;
}

export interface ViewportOffset {
  x: number;
  y: number;
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function renderLocalScene(
  containerEl: HTMLElement,
  scene: PositionedNeighborhood,
  options: RenderLocalSceneOptions
): void {
  containerEl.replaceChildren();

  const sceneEl = document.createElement("div");
  sceneEl.className = "local-view-scene";
  sceneEl.style.width = `${scene.bounds.width}px`;
  sceneEl.style.height = `${scene.bounds.height}px`;

  const edgeLayer = document.createElementNS(SVG_NAMESPACE, "svg");
  edgeLayer.classList.add("local-view-edge-layer");
  edgeLayer.setAttribute("viewBox", `0 0 ${scene.bounds.width} ${scene.bounds.height}`);
  edgeLayer.setAttribute("aria-hidden", "true");
  renderEdges(edgeLayer, scene, options.viewportOffset);

  const nodeLayer = document.createElement("div");
  nodeLayer.className = "local-view-node-layer";
  nodeLayer.appendChild(renderNode(scene.center, options.selectedNodeId, options.viewportOffset));

  for (const positionedNode of scene.neighbors) {
    nodeLayer.appendChild(renderNode(positionedNode, options.selectedNodeId, options.viewportOffset));
  }

  if (scene.neighbors.length === 0) {
    const emptyStateEl = document.createElement("div");
    emptyStateEl.className = "local-view-empty-state";
    emptyStateEl.textContent = "No outgoing links";
    nodeLayer.appendChild(emptyStateEl);
  }

  if (options.showOverflowIndicator && scene.overflowIndicator) {
    nodeLayer.appendChild(renderOverflowIndicator(scene.overflowIndicator, options.viewportOffset));
  }

  sceneEl.appendChild(edgeLayer);
  sceneEl.appendChild(nodeLayer);
  containerEl.appendChild(sceneEl);
}

export function renderNoCurrentFile(containerEl: HTMLElement): void {
  containerEl.replaceChildren();

  const emptyEl = document.createElement("div");
  emptyEl.className = "local-view-no-file";
  emptyEl.textContent = "Open a markdown note";
  containerEl.appendChild(emptyEl);
}

export function renderError(containerEl: HTMLElement, message: string): void {
  containerEl.replaceChildren();

  const errorEl = document.createElement("div");
  errorEl.className = "local-view-error";
  errorEl.textContent = message;
  containerEl.appendChild(errorEl);
}

function renderEdges(edgeLayer: SVGSVGElement, scene: PositionedNeighborhood, offset: ViewportOffset): void {
  const positionsById = new Map(scene.neighbors.map((node) => [node.node.id, node]));
  positionsById.set(scene.center.node.id, scene.center);

  for (const edge of scene.edges) {
    const source = positionsById.get(edge.source);
    const target = positionsById.get(edge.target);
    if (!source || !target) {
      continue;
    }

    const line = document.createElementNS(SVG_NAMESPACE, "line");
    line.classList.add("local-view-edge");
    line.dataset.source = edge.source;
    line.dataset.target = edge.target;
    const sourcePosition = offsetPosition(source, offset);
    const targetPosition = offsetPosition(target, offset);
    line.setAttribute("x1", sourcePosition.x.toString());
    line.setAttribute("y1", sourcePosition.y.toString());
    line.setAttribute("x2", targetPosition.x.toString());
    line.setAttribute("y2", targetPosition.y.toString());
    edgeLayer.appendChild(line);
  }
}

function renderNode(
  positionedNode: PositionedNode,
  selectedNodeId: NodeId | null,
  offset: ViewportOffset
): HTMLElement {
  const node = positionedNode.node;
  const isSelected = !node.isCenter && node.id === selectedNodeId;
  const position = offsetPosition(positionedNode, offset);
  const nodeEl = document.createElement(node.isCenter ? "div" : "button");
  nodeEl.className = node.isCenter ? "local-view-node is-center" : "local-view-node is-neighbor";
  nodeEl.toggleAttribute("data-local-view-selected", isSelected);
  nodeEl.dataset.localViewSlot = positionedNode.slot;
  nodeEl.dataset.localViewNodeId = node.id;
  nodeEl.style.left = `${position.x}px`;
  nodeEl.style.top = `${position.y}px`;
  nodeEl.title = node.path;

  if (!node.isCenter) {
    const buttonEl = nodeEl as HTMLButtonElement;
    buttonEl.type = "button";
    buttonEl.setAttribute("aria-pressed", isSelected ? "true" : "false");
  }

  const labelEl = document.createElement("span");
  labelEl.className = "local-view-node-label";
  labelEl.textContent = node.title;
  nodeEl.appendChild(labelEl);

  return nodeEl;
}

function renderOverflowIndicator(
  indicator: { count: number; x: number; y: number },
  offset: ViewportOffset
): HTMLElement {
  const position = offsetPosition(indicator, offset);
  const overflowEl = document.createElement("div");
  overflowEl.className = "local-view-overflow";
  overflowEl.style.left = `${position.x}px`;
  overflowEl.style.top = `${position.y}px`;
  overflowEl.textContent = `+${indicator.count}`;
  overflowEl.title = `${indicator.count} more outgoing links`;
  return overflowEl;
}

function offsetPosition(position: { x: number; y: number }, offset: ViewportOffset): { x: number; y: number } {
  return {
    x: position.x + offset.x,
    y: position.y + offset.y
  };
}
