# Release Guide

This project publishes an Obsidian community plugin with id `local-view`.

## Local Release Build

```bash
npm install
npm run typecheck
npm test
npm run build
```

Release artifacts expected by Obsidian:

- `main.js`
- `manifest.json`
- `styles.css`

Keep `manifest.json.version`, `package.json.version`, and `versions.json` in sync.

## Test In This Vault

```bash
npm run install-local
```

Then reload Obsidian or disable/enable the plugin.

## GitHub Release

1. Update version fields.
2. Run checks and build.
3. Commit and push.
4. Create a Git tag matching `manifest.json.version`, for example:

```bash
git tag 0.1.0
git push git@github.com:TearingDelight/Local-view.git 0.1.0
```

5. Create a GitHub release for that tag.
6. Upload release assets:

```text
main.js
manifest.json
styles.css
```

Obsidian expects the GitHub release tag to match the version in `manifest.json`.

## BRAT

After a GitHub release exists, users can install through BRAT with:

```text
https://github.com/TearingDelight/Local-view
```

or

```text
TearingDelight/Local-view
```

## Official Community Plugin Directory

To make the plugin installable from Obsidian's built-in Community plugins browser:

1. Make sure the public GitHub repo has valid release assets.
2. Fork `obsidianmd/obsidian-releases`.
3. Add an entry to `community-plugins.json`.
4. Open a pull request for review.

The plugin can be installed by everyone through the official browser only after Obsidian maintainers approve and merge that PR.

## References

- Official release submission docs: https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
- Official manifest schema: https://docs.obsidian.md/Reference/Manifest
- Official versions reference: https://docs.obsidian.md/Reference/Versions
- Community plugin registry: https://github.com/obsidianmd/obsidian-releases
- Sample plugin release notes: https://github.com/obsidianmd/obsidian-sample-plugin

