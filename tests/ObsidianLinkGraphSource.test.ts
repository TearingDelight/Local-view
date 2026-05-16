import { describe, expect, it } from "vitest";
import { ObsidianLinkGraphSource, getFileLevelLinkpath } from "../src/graph/ObsidianLinkGraphSource";
import { makeApp, makeFile } from "./testUtils";

describe("ObsidianLinkGraphSource", () => {
  it("returns resolved outgoing markdown links once per target path", async () => {
    const center = makeFile("Center.md");
    const beta = makeFile("Beta.md");
    const gamma = makeFile("Folder/Gamma.md");
    const pdf = makeFile("Attachment.pdf");
    const app = makeApp([center, beta, gamma, pdf], {
      "Center.md": [
        "Beta",
        "Beta",
        "Folder/Gamma",
        "Missing",
        "Attachment.pdf",
        "Center",
        "^local-block",
        "Beta#^block"
      ]
    });

    const source = new ObsidianLinkGraphSource(app);
    const outgoing = await source.getOutgoingLinks(center);

    expect(outgoing.map((node) => node.path)).toEqual(["Beta.md", "Folder/Gamma.md"]);
    expect(outgoing.every((node) => !node.isCenter)).toBe(true);
  });

  it("normalizes heading links to file-level targets and excludes block-only links", () => {
    expect(getFileLevelLinkpath({ link: "Note#Heading" })).toBe("Note");
    expect(getFileLevelLinkpath({ link: "Folder/Note#Deep heading" })).toBe("Folder/Note");
    expect(getFileLevelLinkpath({ link: "#Heading in current file" })).toBeNull();
    expect(getFileLevelLinkpath({ link: "^block" })).toBeNull();
    expect(getFileLevelLinkpath({ link: "Note#^block" })).toBeNull();
  });
});

