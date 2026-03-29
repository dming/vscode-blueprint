import { describe, expect, it } from "vitest";
import { computeNodeTreeState } from "./graph-tree-state";

describe("computeNodeTreeState", () => {
  it("computes root eligibility from incoming edges in each component", () => {
    const state = computeNodeTreeState(
      [
        { id: "a" },
        { id: "b" },
        { id: "c" },
        { id: "d" },
      ],
      [
        { fromNodeId: "a", toNodeId: "b" },
        { fromNodeId: "c", toNodeId: "b" },
      ]
    );

    expect(state.canSetAsRoot.has("a")).toBe(true);
    expect(state.canSetAsRoot.has("c")).toBe(true);
    expect(state.canSetAsRoot.has("d")).toBe(true);
    expect(state.canSetAsRoot.has("b")).toBe(false);
  });

  it("partitions legal and illegal nodes by the root component", () => {
    const state = computeNodeTreeState(
      [
        { id: "root", isRoot: true },
        { id: "x" },
        { id: "y" },
        { id: "z" },
      ],
      [
        { fromNodeId: "root", toNodeId: "x" },
        { fromNodeId: "y", toNodeId: "z" },
      ]
    );

    expect(state.rootId).toBe("root");
    expect(Array.from(state.legalNodes).sort()).toEqual(["root", "x"]);
    expect(Array.from(state.illegalNodes).sort()).toEqual(["y", "z"]);
  });

  it("keeps numbering stable with root-first BFS and ordered fallback", () => {
    const state = computeNodeTreeState(
      [
        { id: "root", isRoot: true },
        { id: "a" },
        { id: "b" },
        { id: "c" },
        { id: "x" },
        { id: "y" },
      ],
      [
        { fromNodeId: "root", toNodeId: "b" },
        { fromNodeId: "root", toNodeId: "a" },
        { fromNodeId: "b", toNodeId: "c" },
        { fromNodeId: "y", toNodeId: "x" },
      ]
    );

    expect(state.numberById.get("root")).toBe(0);
    expect(state.numberById.get("a")).toBe(1);
    expect(state.numberById.get("b")).toBe(2);
    expect(state.numberById.get("c")).toBe(3);
    expect(state.numberById.get("x")).toBe(4);
    expect(state.numberById.get("y")).toBe(5);
  });

  it("handles cycle-heavy graphs without root candidates inside cycle", () => {
    const state = computeNodeTreeState(
      [
        { id: "a" },
        { id: "b" },
        { id: "c" },
        { id: "iso" },
      ],
      [
        { fromNodeId: "a", toNodeId: "b" },
        { fromNodeId: "b", toNodeId: "c" },
        { fromNodeId: "c", toNodeId: "a" },
      ]
    );

    // All nodes in cycle have incoming edges; isolated node can still be root.
    expect(Array.from(state.canSetAsRoot).sort()).toEqual(["iso"]);
    expect(state.rootId).toBe(null);
    expect(Array.from(state.legalNodes)).toEqual([]);
    expect(Array.from(state.illegalNodes).sort()).toEqual(["a", "b", "c", "iso"]);
    expect(state.numberById.size).toBe(4);
  });

  it("defends against invalid multi-root data by selecting first root deterministically", () => {
    const state = computeNodeTreeState(
      [
        { id: "r1", isRoot: true },
        { id: "n1" },
        { id: "r2", isRoot: true },
        { id: "n2" },
      ],
      [
        { fromNodeId: "r1", toNodeId: "n1" },
        { fromNodeId: "r2", toNodeId: "n2" },
      ]
    );

    // Current defense behavior: first `isRoot` in node order wins.
    expect(state.rootId).toBe("r1");
    expect(state.numberById.get("r1")).toBe(0);
    expect(Array.from(state.legalNodes).sort()).toEqual(["n1", "r1"]);
    expect(Array.from(state.illegalNodes).sort()).toEqual(["n2", "r2"]);
    expect(state.numberById.get("r2")).toBeGreaterThan(0);
  });
});
