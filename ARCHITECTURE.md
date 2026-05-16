# Local View Architecture

Local View is a spatial navigation layer for Obsidian.

It is not a global graph, not an ontology system, and not a PKM dashboard. The MVP answers one narrow question:

```text
Where am I, and what can I move to next?
```

## MVP Scope

Implemented:

- one `ItemView` panel registered as `local-view`;
- ribbon icon that opens/focuses Local View as a normal main workspace tab;
- command to open Local View as a main tab;
- separate command to open Local View in the right sidebar;
- current markdown file as center node;
- resolved outgoing wikilinks as neighbors;
- deterministic neighbor layout with ring and fan modes;
- click navigation;
- keyboard ring selection and enter-selected navigation;
- local back history;
- follow-active-note support;
- visible neighbor limit and overflow indicator.

Out of scope unless explicitly requested:

- global graph visualization;
- whole-vault layout;
- Breadcrumbs, Dataview or Juggl dependency;
- ontology inference;
- Canvas edges;
- incoming backlinks;
- depth 2+ traversal by default;
- persistent spatial coordinates.

## Data Flow

```text
Obsidian workspace events
  -> NavigationController
  -> NeighborhoodBuilder
  -> ObsidianLinkGraphSource
  -> RadialLayoutEngine (ring or fan mode)
  -> LocalView / renderLocalScene
  -> ClickInputAdapter
  -> NavigationController
  -> Obsidian workspace
```

## Source Files

Bootstrap:

- `src/main.ts`
- `src/constants.ts`
- `src/settings.ts`

Graph core:

- `src/graph/types.ts`
- `src/graph/GraphSource.ts`
- `src/graph/ObsidianLinkGraphSource.ts`
- `src/graph/NeighborhoodBuilder.ts`

Navigation:

- `src/navigation/RingSelectionResolver.ts`
- `src/navigation/NavigationController.ts`
- `src/navigation/NavigationIntent.ts`

Layout:

- `src/layout/LayoutEngine.ts`
- `src/layout/RadialLayoutEngine.ts`

Input and rendering:

- `src/input/InputAdapter.ts`
- `src/input/ClickInputAdapter.ts`
- `src/input/CompositeInputAdapter.ts`
- `src/input/KeyboardInputAdapter.ts`
- `src/view/LocalView.ts`
- `src/view/renderLocalScene.ts`
- `src/view/styles.css`

Tests:

- `tests/*.test.ts`
- `tests/testUtils.ts`

## Link Source

The MVP uses only file-level outgoing wikilinks resolved by Obsidian:

- included: `[[Note]]`, `[[Note|Alias]]`, heading links normalized to the target file;
- excluded: unresolved links, embeds, block links as separate nodes, Canvas edges, frontmatter fields, Dataview inline fields, external links.

`ObsidianLinkGraphSource` reads `metadataCache.getFileCache(file).links` and resolves targets with `metadataCache.getFirstLinkpathDest`.

## View Opening

`Local view: Open local view` and the ribbon icon call:

```ts
activateView("tab")
```

This prefers an existing `local-view` leaf in the main workspace root. If none exists, it creates a new normal tab with `workspace.getLeaf("tab")`.

`Local view: Open local view in right sidebar` calls:

```ts
activateView("sidebar")
```

This uses `workspace.getRightLeaf(false)` when possible.

## Keyboard Navigation

Keyboard controls are intentionally split between Local View movement and Obsidian file opening:

- `A` / `ArrowLeft` emits `select-previous` and cycles the selected visible neighbor backward.
- `D` / `ArrowRight` emits `select-next` and cycles the selected visible neighbor forward.
- `W` / `ArrowUp` emits `enter-selected` and changes only Local View's center node.
- `S` / `ArrowDown` emits `back` and returns through Local View's own history.
- `Enter` / `Space` emits `open-selected` and opens the selected file in Obsidian without changing Local View's center.

`NavigationController` owns this behavior. Its history entries store both the previous center node and the neighbor that should remain selected after returning. This is what keeps `S` continuous: after entering `Gamma` from `Alpha`, going back to `Alpha` keeps `Gamma` selected.

`open-selected` suppresses the next matching Obsidian `file-open` event so `followActiveNote` does not accidentally turn a file open into a Local View movement.

## Layout Modes

`settings.layoutMode` controls how `RadialLayoutEngine` positions the same local neighborhood:

- `ring`: the original full radial circle around the center.
- `fan`: an upper arc, closer to a skill-tree fan, with the center lower in the viewport.

Both modes keep the same deterministic neighbor order from `NeighborhoodBuilder`. Selection order follows the visible neighbor order, not geometry.

## Viewport Transform

Local View has a view-only transform owned by `LocalView`:

- mouse wheel changes `distanceScale`;
- pointer drag changes `viewportOffset`;
- `distanceScale` is passed to `RadialLayoutEngine`, so node coordinates move farther from or closer to the center;
- `viewportOffset` is passed to `renderLocalScene`, so the rendered scene pans without changing graph state.

Do not use CSS `transform: scale(...)` on the scene for zooming. Node cards must keep their rendered size; zoom changes only distances and edge lengths. The selected neighbor uses a higher z-index than other neighbors so it reads like a card pulled from a stack.

## Agent Notes

When changing Local View behavior, update all three documentation layers when relevant:

- `AGENTS.md` for rules future AI agents must follow.
- `ARCHITECTURE.md` for implemented system behavior and module contracts.
- `plans/Local View MVP Architecture Plan.md` for product/architecture intent and future direction.

Keep renderer responsibilities narrow: render state and emit intents only. Navigation semantics belong in `NavigationController`; selection order belongs in `RingSelectionResolver`; node positions belong in `RadialLayoutEngine`.

## Release Files

Root release files:

- `manifest.json`
- `main.js`
- `styles.css`
- `versions.json`

`main.js` is generated by esbuild from `src/main.ts`.

`styles.css` is copied from `src/view/styles.css`.
