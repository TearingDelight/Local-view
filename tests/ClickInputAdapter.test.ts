import { describe, expect, it } from "vitest";
import { shouldOpenNodeFromTap, type NodeTap } from "../src/input/ClickInputAdapter";

describe("shouldOpenNodeFromTap", () => {
  it("uses native click detail for desktop double-clicks", () => {
    expect(shouldOpenNodeFromTap(tap({ detail: 2 }), null)).toBe(true);
  });

  it("treats two close taps on the same node as an open action", () => {
    const previousTap = tap({ time: 1000, clientX: 20, clientY: 40 });
    const nextTap = tap({ time: 1280, clientX: 24, clientY: 43 });

    expect(shouldOpenNodeFromTap(nextTap, previousTap)).toBe(true);
  });

  it("does not open when the second tap is too late, far away, or on another node", () => {
    const previousTap = tap({ nodeId: "Alpha.md", time: 1000, clientX: 20, clientY: 40 });

    expect(shouldOpenNodeFromTap(tap({ nodeId: "Alpha.md", time: 1500, clientX: 20, clientY: 40 }), previousTap))
      .toBe(false);
    expect(shouldOpenNodeFromTap(tap({ nodeId: "Alpha.md", time: 1200, clientX: 80, clientY: 40 }), previousTap))
      .toBe(false);
    expect(shouldOpenNodeFromTap(tap({ nodeId: "Beta.md", time: 1200, clientX: 20, clientY: 40 }), previousTap))
      .toBe(false);
  });
});

function tap(overrides: Partial<NodeTap> = {}): NodeTap {
  return {
    nodeId: "Alpha.md",
    clientX: 10,
    clientY: 10,
    detail: 1,
    time: 1000,
    ...overrides
  };
}
