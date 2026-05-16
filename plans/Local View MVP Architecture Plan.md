# Local View MVP Architecture Plan

Date: 2026-05-16
Status: planning
Project: Local view
Obsidian plugin id: local-view

## 0. Core Thesis

Local View is a spatial navigation layer for Obsidian.

It is not a global graph, not an ontology system, and not a PKM dashboard.

The MVP should answer one narrow question:

> Where am I, and what can I move to next?

Each note is treated as a local position in knowledge space. Each link traversal is a movement.

The MVP must stay small enough to be reliable:

```text
current file
-> resolved outgoing wikilinks
-> deterministic radial layout
-> click navigation
-> local history back
-> Obsidian ItemView panel
```

Everything else is future extension.

## 1. Non-Goals

The MVP must not implement:

- global graph visualization;
- whole-vault layout;
- Breadcrumbs dependency;
- Dataview dependency;
- Juggl dependency;
- ontology inference;
- physics simulation;
- heavy graph visualization frameworks;
- folder/file-tree navigation;
- depth 2+ graph traversal by default.

The plugin should use Obsidian's native metadata cache and stay lightweight.

## 2. MVP Scope

The first implementation should support:

- one Local View panel inside Obsidian;
- current note as the center node;
- immediate outgoing resolved wikilinks as neighbors;
- deterministic radial neighbor layout;
- clickable neighbor nodes;
- navigation to clicked neighbor;
- local navigation history;
- back command;
- active-note following with loop protection;
- configurable neighbor limit;
- graceful handling of notes with too many links.

Incoming links are not part of the first core path. They can be added behind a setting only after there is a safe indexing strategy.

## 3. Source of Truth for MVP Links

MVP neighbors come from resolved file-level wikilinks in the markdown body.

Included:

- normal wikilinks: `[[Note]]`;
- aliased wikilinks: `[[Note|Alias]]`;
- links resolved to existing `TFile` notes.

Excluded from MVP:

- unresolved links;
- embeds;
- block links;
- heading links as separate nodes;
- Canvas edges;
- folder structure;
- frontmatter relation fields;
- Breadcrumbs relation fields;
- Dataview inline fields;
- external links.

This restriction is intentional. It keeps behavior predictable and performance local.

Future versions may add optional relation providers, but the base graph source should remain plain Obsidian links.

## 4. Architecture Overview

```text
Obsidian Workspace Events
  -> NavigationController
  -> NeighborhoodBuilder
  -> ObsidianLinkGraphSource
  -> RadialLayoutEngine
  -> LocalViewRenderer
  -> InputAdapter
  -> NavigationController
  -> Obsidian Workspace
```

The core rule:

```text
UI emits intents.
NavigationController decides movement.
GraphSource extracts links.
LayoutEngine positions nodes.
Renderer only renders state.
```

No DOM component should directly decide graph semantics.

## 5. Modules

### 5.1 Plugin Bootstrap

Responsible for:

- registering the Local View type;
- registering commands;
- creating shared services;
- loading and saving settings;
- subscribing to Obsidian events;
- cleaning up on unload.

Expected files:

```text
src/main.ts
src/constants.ts
src/settings.ts
```

### 5.2 ObsidianLinkGraphSource

Responsible for:

- reading outgoing links from `metadataCache.getFileCache(file)`;
- resolving links through `metadataCache.getFirstLinkpathDest`;
- normalizing node ids to file paths;
- removing duplicate links;
- returning only existing markdown files.

It should not:

- scan the whole vault per navigation;
- know anything about UI layout;
- infer ontology relations.

Expected files:

```text
src/graph/GraphSource.ts
src/graph/ObsidianLinkGraphSource.ts
```

### 5.3 NeighborhoodBuilder

Responsible for:

- accepting the current center file;
- asking `GraphSource` for local links;
- creating a `LocalNeighborhood`;
- applying neighbor limits;
- sorting neighbors deterministically;
- marking overflow count.

Expected files:

```text
src/graph/NeighborhoodBuilder.ts
```

### 5.4 NavigationController

Responsible for:

- storing current node id;
- storing local navigation history;
- receiving navigation intents;
- opening target files in Obsidian;
- distinguishing internal navigation from external active-file changes;
- exposing future spatial movement methods.

Public methods:

```ts
moveTo(nodeId: NodeId): Promise<void>;
moveLeft(): Promise<void>;
moveRight(): Promise<void>;
moveUp(): Promise<void>;
moveDown(): Promise<void>;
goBack(): Promise<void>;
setCurrentFromWorkspace(file: TFile): Promise<void>;
```

In MVP:

- `moveTo` is implemented;
- `goBack` is implemented;
- directional movement may exist as command stubs or no-op methods;
- directional resolution is not exposed to users until layout focus is stable.

Expected files:

```text
src/navigation/NavigationController.ts
src/navigation/NavigationIntent.ts
```

### 5.5 Layout Engine

Responsible for:

- taking `LocalNeighborhood`;
- returning stable node positions;
- assigning directional slots for future keyboard navigation.

MVP layout:

- center node at `0, 0`;
- neighbors arranged in a circle;
- order is deterministic;
- same center and same neighbor set must produce the same positions.

Expected files:

```text
src/layout/LayoutEngine.ts
src/layout/RadialLayoutEngine.ts
```

### 5.6 Renderer

Responsible for:

- rendering the panel;
- rendering center node;
- rendering neighbor nodes;
- rendering simple edges;
- rendering overflow indicator;
- rendering empty state;
- forwarding clicks as navigation intents.

Renderer should not:

- query Obsidian metadata directly;
- open files directly;
- decide navigation semantics.

Expected files:

```text
src/view/LocalView.ts
src/view/renderLocalScene.ts
src/view/styles.css
```

### 5.7 Input Layer

MVP:

- click input only.

Future:

- keyboard input adapter;
- WASD adapter;
- Arrow key adapter;
- gamepad adapter.

Input adapters emit intent objects:

```ts
type NavigationIntent =
  | { type: "move-to"; nodeId: NodeId }
  | { type: "back" }
  | { type: "select-previous" }
  | { type: "select-next" }
  | { type: "enter-selected" };
```

Expected files:

```text
src/input/InputAdapter.ts
src/input/ClickInputAdapter.ts
```

Keyboard adapter should wait until v1 unless implementation remains trivial.

## 6. Data Model

```ts
type NodeId = string; // normalized TFile.path

interface LocalNode {
  id: NodeId;
  path: string;
  title: string;
  file: TFile;
  isCenter: boolean;
}

interface LocalEdge {
  source: NodeId;
  target: NodeId;
  direction: "outgoing";
  kind: "wikilink";
}

interface LocalNeighbor {
  node: LocalNode;
  relationToCenter: "outgoing";
  weight: number;
}

interface LocalNeighborhood {
  center: LocalNode;
  neighbors: LocalNeighbor[];
  edges: LocalEdge[];
  overflowCount: number;
  generatedAt: number;
}

interface PositionedNode {
  node: LocalNode;
  x: number;
  y: number;
  slot: DirectionalSlot;
}

type DirectionalSlot =
  | "center"
  | "up"
  | "upper-right"
  | "right"
  | "lower-right"
  | "down"
  | "lower-left"
  | "left"
  | "upper-left";
```

Keep the model file-level. A heading or block can be a future target type, but not in MVP.

## 7. Data Flow

### 7.1 Initial Open

```text
User runs "Local view: Open"
  -> plugin opens LocalView ItemView
  -> LocalView asks NavigationController for active file
  -> NeighborhoodBuilder builds local neighborhood
  -> RadialLayoutEngine computes positions
  -> Renderer paints scene
```

### 7.2 Click Navigation

```text
User clicks neighbor
  -> ClickInputAdapter emits { type: "move-to", nodeId }
  -> NavigationController pushes current node to history
  -> NavigationController opens target file
  -> LocalView rebuilds around target file
```

### 7.3 External File Change

```text
User opens another note outside Local View
  -> workspace emits file-open
  -> plugin checks followActiveNote setting
  -> NavigationController updates current node without pushing history
  -> LocalView rebuilds
```

### 7.4 Internal Navigation Loop Protection

Navigation must distinguish internal movement from external workspace changes:

```ts
type NavigationOrigin = "internal" | "external";
```

When `moveTo` opens a file, the next `file-open` event should not create a duplicate history entry or trigger redundant navigation.

Suggested state:

```ts
interface NavigationState {
  currentNodeId: NodeId | null;
  history: NodeId[];
  pendingInternalOpen: NodeId | null;
}
```

## 8. UX Flow

The Local View panel should feel like a compact spatial cockpit:

- center node is visually dominant;
- neighbors surround it;
- links are visible but quiet;
- click means movement;
- back returns to the previous position;
- no folders, no global graph, no full vault scan.

Empty state:

```text
No outgoing links
```

This state should still show the current note as center, so the user feels located rather than dropped into an empty screen.

Hub note state:

```text
24 visible neighbors + overflow indicator
```

The overflow indicator is not a list in MVP. It simply communicates that the local area has more links than currently displayed.

## 9. Navigation Model

The navigation model should be event-driven from the beginning.

MVP user-facing navigation:

- click neighbor -> move to neighbor;
- command -> go back.

Keyboard navigation:

- `A` / Left Arrow -> select previous visible link around the ring;
- `D` / Right Arrow -> select next visible link around the ring;
- `W` / Up Arrow -> enter selected note and rebuild around it;
- `S` / Down Arrow -> go back through Local View history;
- `Enter` / `Space` -> enter selected note.

Important decision:

```text
AD changes selection.
WS changes position.
```

This keeps the default controls close to a skill-tree UI while avoiding accidental movement on horizontal selection.

### Ring Selection Resolver

Keyboard and future gamepad selection should be resolved by a dedicated component:

```text
NavigationIntent
  -> RingSelectionResolver
  -> selected NodeId
  -> NavigationController.enterSelected()
```

Resolution order for v1:

1. keep selected neighbor if it remains visible;
2. otherwise select the first visible neighbor;
3. `previous` / `next` wraps around the visible radial order.

Resolution order for future semantic mode:

1. explicit relation provider candidate;
2. spatial candidate;
3. deterministic fallback.

## 10. UI Layout Strategy

MVP layout: deterministic radial layout.

Rules:

- center at the visual center of the panel;
- radius adapts to panel size;
- nodes have stable dimensions;
- labels are truncated, not allowed to resize the layout;
- neighbor order is deterministic;
- edge layer is visually secondary;
- hover highlights the neighbor and its center edge;
- selected/focused neighbor style exists even before keyboard navigation ships.

Suggested ordering:

```text
sort by title localeCompare, then path
```

Later this can become:

```text
relation priority -> title -> path
```

But MVP should avoid relation inference.

### Hub Notes

Default visible neighbor limit:

```text
24
```

If a note has more outgoing links:

- render the first 24 by deterministic order;
- show a small overflow node like `+17`;
- do not expand into a list by default;
- future version may add filtering or search.

## 11. Obsidian API Integration Points

Required:

- `Plugin.onload`;
- `Plugin.onunload`;
- `registerView`;
- `ItemView`;
- `addCommand`;
- `workspace.getActiveFile`;
- `workspace.getLeaf`;
- `WorkspaceLeaf.openFile`;
- `workspace.on("file-open")`;
- `workspace.on("active-leaf-change")`;
- `metadataCache.getFileCache`;
- `metadataCache.getFirstLinkpathDest`;
- `metadataCache.on("changed")`;
- `metadataCache.on("deleted")`;
- `vault.on("rename")`.

MVP commands:

```text
Local view: Open local view
Local view: Focus current note
Local view: Go back
```

Future commands:

```text
Local view: Move up
Local view: Move down
Local view: Move left
Local view: Move right
Local view: Toggle follow active note
```

## 12. Performance Considerations

Target per navigation:

```text
O(local outgoing link count)
```

Avoid:

- scanning all markdown files on every movement;
- computing global graph layout;
- using heavy visualization dependencies;
- resolving the same duplicate link repeatedly;
- rebuilding on every metadata event without debounce.

Recommended:

- read outgoing links from Obsidian metadata cache;
- deduplicate by resolved file path;
- cache the most recent neighborhood by center path;
- invalidate on metadata change, delete, and rename;
- debounce refreshes around metadata updates;
- keep rendering bounded by `visibleNeighborLimit`.

Incoming links should be deferred unless implemented through a maintained reverse index.

## 13. Settings

MVP settings:

```ts
interface LocalViewSettings {
  followActiveNote: boolean;
  visibleNeighborLimit: number;
  openTargetsInActiveLeaf: boolean;
  showOverflowIndicator: boolean;
}
```

Defaults:

```ts
{
  followActiveNote: true,
  visibleNeighborLimit: 24,
  openTargetsInActiveLeaf: true,
  showOverflowIndicator: true
}
```

Deferred settings:

- include incoming links;
- include frontmatter links;
- include unresolved links;
- enable keyboard navigation;
- enable semantic relation providers.

## 14. Testing Strategy

Unit tests should cover:

- outgoing wikilink extraction;
- alias link resolution;
- duplicate link deduplication;
- missing/unresolved link exclusion;
- deterministic neighbor sorting;
- neighbor limit and overflow count;
- navigation history;
- internal vs external navigation event handling;
- radial layout stability.

Manual Obsidian tests:

- open Local View from a normal note;
- click through 5 linked notes;
- use back command;
- open unrelated note manually and verify follow mode;
- test note with no outgoing links;
- test hub note with more than 24 outgoing links;
- rename a linked note and verify refresh;
- delete a linked note and verify refresh.

## 15. Open-Source Packaging

MVP repository should include:

- `manifest.json`;
- `versions.json`;
- `package.json`;
- `tsconfig.json`;
- build config;
- `README.md`;
- `LICENSE`;
- release instructions;
- screenshot or short GIF once UI exists;
- BRAT installation instructions;
- mobile compatibility note.

The plugin should be easy to inspect and build locally.

## 16. Constraints and Known Limitations

MVP limitations:

- outgoing links only;
- no semantic parent/child interpretation;
- no Breadcrumbs relation awareness;
- no incoming backlinks by default;
- no graph search;
- no persistent spatial memory;
- no saved node coordinates;
- no depth 2 preview;
- no Canvas integration;
- no ontology layer.

These limitations are acceptable because the MVP is testing the feel of local movement, not graph intelligence.

## 17. Roadmap

### Phase 1: Scaffold

1. Create Obsidian plugin project structure.
2. Add TypeScript build pipeline.
3. Add manifest and versions files.
4. Add minimal README and license.
5. Verify plugin loads in a test vault.

### Phase 2: Local Graph Core

1. Implement `ObsidianLinkGraphSource`.
2. Implement `NeighborhoodBuilder`.
3. Implement data model types.
4. Add unit tests for link extraction and deduplication.

### Phase 3: View and Rendering

1. Register `LocalView` ItemView.
2. Render center node.
3. Render outgoing neighbors.
4. Render simple edge layer.
5. Add empty state.
6. Add hub overflow indicator.

### Phase 4: Navigation

1. Implement click input.
2. Implement `NavigationController.moveTo`.
3. Implement local history.
4. Implement `goBack`.
5. Add loop protection for internal file opens.
6. Add commands.

### Phase 5: Settings and Polish

1. Add settings tab.
2. Add visible neighbor limit setting.
3. Add follow active note setting.
4. Add CSS variables for Obsidian theme compatibility.
5. Test light and dark themes.

### Phase 6: MVP Release

1. Write README with concept, scope, and limitations.
2. Add screenshot/GIF.
3. Document BRAT install.
4. Tag first release.
5. Publish as open-source repository.

## 18. v1 Direction

v1 should add keyboard spatial navigation only after the MVP click model feels good.

Planned v1 features:

- keyboard focus ring;
- WASD and Arrow key input;
- ring selection resolver;
- incoming links behind setting;
- hover preview;
- better hub handling;
- persistent view preferences.

The default keyboard contract:

```text
W / ArrowUp      -> enter selected note
A / ArrowLeft    -> select previous visible link
S / ArrowDown    -> go back
D / ArrowRight   -> select next visible link
Enter / Space    -> enter selected note
```

Obsidian commands expose the same actions so users can assign custom hotkeys.

## 19. v2 Direction

v2 can introduce optional intelligence without bloating the core:

- relation provider interface;
- optional frontmatter/Breadcrumbs adapter;
- local semantic sectors;
- spatial memory per note;
- depth 2 preview on demand;
- local trail visualization;
- optional gamepad adapter.

Architecture rule for v2:

```text
New graph intelligence must enter through adapters.
The Local View core remains plain-link spatial navigation.
```

## 20. Final Design Principle

Local View should feel like standing inside a note and seeing only the doors nearby.

Not the city map.
Not the filesystem.
Not the ontology.

Just the local space, clear enough to move through.
