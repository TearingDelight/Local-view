# Local View

Local View is a compact spatial navigation panel for Obsidian. It answers one MVP question: where am I, and what can I move to next?

The first version intentionally stays local:

- current markdown file as the center node;
- resolved outgoing wikilinks as radial neighbors;
- deterministic neighbor sorting and layout;
- click navigation to a neighbor;
- local back history;
- follow-active-note support;
- configurable visible neighbor limit and overflow marker.

## Non-Goals

Local View does not scan the whole vault, compute a global layout, depend on Breadcrumbs/Juggl/Dataview, infer ontology relations, or show depth 2+ neighbors by default.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run install-local
```

`npm run build` writes the Obsidian release files expected by BRAT and manual installation:

- `main.js`
- `manifest.json`
- `styles.css`

`npm run install-local` rebuilds the plugin and copies those release files into `.obsidian/plugins/local-view` for testing this repository as an Obsidian vault.

For architecture, agent workflow, and publishing notes, see:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `RELEASE.md`

## Manual Installation

1. Build the plugin.
2. Copy or symlink this repository into `<vault>/.obsidian/plugins/local-view`.
3. Enable community plugins in Obsidian.
4. Enable `Local View`.
5. Run `Local view: Open local view`.

## BRAT Installation

After the repository has a release with `main.js`, `manifest.json`, and `styles.css`, add this repository to BRAT as:

```text
TearingDelight/Local-view
```

## Commands

- `Local view: Open local view`
- `Local view: Open local view in right sidebar`
- `Local view: Focus current note`
- `Local view: Go back`
- `Local view: Select previous linked note`
- `Local view: Select next linked note`
- `Local view: Move to selected linked note`

The ribbon icon opens or focuses Local View as a normal main workspace tab. The right sidebar command is kept for compact side-panel use.

## Keyboard Navigation

When focus is inside Local View:

- `A` / `ArrowLeft` selects the previous visible link around the ring;
- `D` / `ArrowRight` selects the next visible link around the ring;
- `W` / `ArrowUp` moves Local View to the selected note and makes it the center;
- `S` / `ArrowDown` goes back through Local View's own history and keeps the note you came from selected;
- `Enter` / `Space` also moves Local View to the selected note.

Keyboard movement changes Local View's center without opening or focusing the note editor. The physical `WASD` key positions are used, so the default controls keep working across keyboard layouts. The same actions are also available as Obsidian commands, so users can assign their own hotkeys.

## Settings

- `followActiveNote`
- `visibleNeighborLimit`
- `openTargetsInActiveLeaf`
- `showOverflowIndicator`

## Current Limitations

- outgoing wikilinks only;
- only existing markdown file targets;
- no incoming backlinks;
- no Canvas integration;
- no semantic relation providers;
- no persistent spatial coordinates.

## Release Checklist

1. Run `npm run typecheck`.
2. Run `npm test`.
3. Run `npm run build`.
4. Smoke test in an Obsidian vault.
5. Add a screenshot or short GIF after the first visual smoke test.
6. Tag the release and upload `main.js`, `manifest.json`, and `styles.css`.
