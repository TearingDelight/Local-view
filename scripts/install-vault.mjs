import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

const releaseFiles = ["manifest.json", "main.js", "styles.css"];
const vaultArg = process.argv[2];

if (!vaultArg) {
  console.error("Usage: npm run install-vault -- /path/to/ObsidianVault");
  process.exit(1);
}

const vaultDir = isAbsolute(vaultArg) ? vaultArg : resolve(process.cwd(), vaultArg);

try {
  if (!statSync(vaultDir).isDirectory()) {
    throw new Error("not a directory");
  }
} catch {
  console.error(`Vault path does not exist or is not a directory: ${vaultDir}`);
  process.exit(1);
}

const pluginDir = join(vaultDir, ".obsidian", "plugins", "local-view");

mkdirSync(pluginDir, { recursive: true });

for (const file of releaseFiles) {
  copyFileSync(file, join(pluginDir, file));
}

console.log(`Installed Local View into ${pluginDir}`);
