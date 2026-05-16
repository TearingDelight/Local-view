import type { PositionedNeighborhood, PositionedNode } from "../layout/LayoutEngine";
import type { NodeId } from "../graph/types";

export interface RenderLocalSceneOptions {
  selectedNodeId: NodeId | null;
  showOverflowIndicator: boolean;
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
  renderEdges(edgeLayer, scene);

  const nodeLayer = document.createElement("div");
  nodeLayer.className = "local-view-node-layer";
  nodeLayer.appendChild(renderNode(scene.center, options.selectedNodeId));

  for (const positionedNode of scene.neighbors) {
    nodeLayer.appendChild(renderNode(positionedNode, options.selectedNodeId));
  }

  if (scene.neighbors.length === 0) {
    const emptyStateEl = document.createElement("div");
    emptyStateEl.className = "local-view-empty-state";
    emptyStateEl.textContent = "No outgoing links";
    nodeLayer.appendChild(emptyStateEl);
  }

  if (options.showOverflowIndicator && scene.overflowIndicator) {
    nodeLayer.appendChild(renderOverflowIndicator(scene.overflowIndicator));
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

function renderEdges(edgeLayer: SVGSVGElement, scene: PositionedNeighborhood): void {
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
    line.setAttribute("x1", source.x.toString());
    line.setAttribute("y1", source.y.toString());
    line.setAttribute("x2", target.x.toString());
    line.setAttribute("y2", target.y.toString());
    edgeLayer.appendChild(line);
  }
}

function renderNode(positionedNode: PositionedNode, selectedNodeId: NodeId | null): HTMLElement {
  const node = positionedNode.node;
  const isSelected = !node.isCenter && node.id === selectedNodeId;
  const nodeEl = document.createElement(node.isCenter ? "div" : "button");
  nodeEl.className = node.isCenter ? "local-view-node is-center" : "local-view-node is-neighbor";
  nodeEl.toggleAttribute("data-local-view-selected", isSelected);
  nodeEl.dataset.localViewSlot = positionedNode.slot;
  nodeEl.style.left = `${positionedNode.x}px`;
  nodeEl.style.top = `${positionedNode.y}px`;
  nodeEl.title = node.path;

  if (!node.isCenter) {
    const buttonEl = nodeEl as HTMLButtonElement;
    buttonEl.type = "button";
    buttonEl.dataset.localViewNodeId = node.id;
    buttonEl.setAttribute("aria-pressed", isSelected ? "true" : "false");
  }

  const labelEl = document.createElement("span");
  labelEl.className = "local-view-node-label";
  labelEl.textContent = node.title;
  nodeEl.appendChild(labelEl);

  return nodeEl;
}

function renderOverflowIndicator(indicator: { count: number; x: number; y: number }): HTMLElement {
  const overflowEl = document.createElement("div");
  overflowEl.className = "local-view-overflow";
  overflowEl.style.left = `${indicator.x}px`;
  overflowEl.style.top = `${indicator.y}px`;
  overflowEl.textContent = `+${indicator.count}`;
  overflowEl.title = `${indicator.count} more outgoing links`;
  return overflowEl;
}
