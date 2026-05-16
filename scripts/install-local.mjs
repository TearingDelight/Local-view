import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const pluginDir = join(".obsidian", "plugins", "local-view");
const releaseFiles = ["manifest.json", "main.js", "styles.css"];

mkdirSync(pluginDir, { recursive: true });

for (const file of releaseFiles) {
  copyFileSync(file, join(pluginDir, file));
}

console.log(`Installed Local View into ${pluginDir}`);

