# Agent Rules

## Language

Всегда отвечай пользователю на русском.

## Project

Этот репозиторий - Obsidian community plugin `local-view`.

Цель MVP: компактная пространственная навигация вокруг текущей заметки:

```text
current markdown file
-> resolved outgoing wikilinks
-> deterministic radial layout
-> click navigation
-> local back history
-> Obsidian ItemView tab
```

Не превращай MVP в global graph, ontology layer, Breadcrumbs/Juggl/Dataview adapter или whole-vault scanner без явного запроса.

## What To Read First

1. `ARCHITECTURE.md`
2. `plans/Local View MVP Architecture Plan.md`
3. `README.md`
4. `RELEASE.md` для публикации и релизов

## Development Commands

```bash
npm run typecheck
npm test
npm run build
npm run install-local
```

`npm run install-local` пересобирает `main.js` и копирует `main.js`, `manifest.json`, `styles.css` в `.obsidian/plugins/local-view/` для тестирования этого репозитория как vault.

## Git Workflow

После содержательных изменений делай commit и push только своих изменений.

Перед commit:

```bash
git status --short
git diff
git add <only files changed by the agent>
git commit -m "message"
git push git@github.com:TearingDelight/Local-view.git main
```

Не добавляй случайный vault-шум:

- `.DS_Store`
- `.obsidian/workspace.json`
- `.obsidian/graph.json`
- `.obsidian/community-plugins.json`
- `.obsidian/plugins/local-view/`
- временные или экспериментальные vault-папки вроде `Skyrim/`, если пользователь явно не попросил

## Build Artifacts

В этом репозитории `main.js` и `styles.css` в корне отслеживаются git'ом, потому что они нужны для GitHub release assets и установки через BRAT/manual install.

Локальная копия в `.obsidian/plugins/local-view/` не отслеживается.

## Architecture Rules

- UI emits intents.
- `NavigationController` decides movement.
- `ObsidianLinkGraphSource` extracts outgoing links from Obsidian metadata cache.
- `NeighborhoodBuilder` sorts, limits and reports overflow.
- `RadialLayoutEngine` positions nodes deterministically.
- Renderer renders state and forwards click intents only.

Renderer не должен читать Obsidian metadata напрямую и не должен открывать файлы.

## Verification

Для обычного изменения:

```bash
npm run typecheck
npm test
npm run install-local
```

Если менялись release files или publishing docs, дополнительно проверь:

```bash
node -e "for (const f of ['manifest.json','versions.json']) JSON.parse(require('fs').readFileSync(f,'utf8'))"
```

