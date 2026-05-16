import type { App, TFile } from "obsidian";

export function makeFile(path: string): TFile {
  const name = path.split("/").pop() ?? path;
  const extension = name.includes(".") ? name.split(".").pop() ?? "" : "";
  const basename = extension ? name.slice(0, -(extension.length + 1)) : name;

  return {
    path,
    name,
    basename,
    extension
  } as TFile;
}

export function makeApp(files: TFile[], cache: Record<string, string[]> = {}): App {
  const filesByPath = new Map(files.map((file) => [file.path, file]));
  const filesByLinkpath = new Map<string, TFile>();

  for (const file of files) {
    filesByLinkpath.set(file.basename, file);
    filesByLinkpath.set(file.path, file);
    if (file.extension === "md") {
      filesByLinkpath.set(file.path.slice(0, -3), file);
    }
  }

  return {
    metadataCache: {
      getFileCache(file: TFile) {
        return {
          links: (cache[file.path] ?? []).map((link) => ({ link }))
        };
      },
      getFirstLinkpathDest(linkpath: string) {
        return filesByLinkpath.get(linkpath) ?? filesByPath.get(linkpath) ?? null;
      }
    },
    vault: {
      getAbstractFileByPath(path: string) {
        return filesByPath.get(path) ?? null;
      }
    },
    workspace: {
      activeLeaf: null,
      getLeavesOfType() {
        return [];
      },
      getLeaf() {
        return {
          openFile: async () => undefined
        };
      }
    }
  } as unknown as App;
}
