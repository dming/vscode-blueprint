import { describe, expect, it } from "vitest";
import { validateBlueprintDocument } from "./validateBlueprintDocument";

describe("validateBlueprintDocument", () => {
  it("returns warning (not error) for multi-root documents", () => {
    const issues = validateBlueprintDocument(
      {
        graph: {
          nodes: [
            { id: "r1", isRoot: true, inputs: [], outputs: [{ name: "exec", type: "exec" }] },
            { id: "r2", isRoot: true, inputs: [], outputs: [{ name: "exec", type: "exec" }] },
          ],
          edges: [],
        },
      },
      "sample/multi-root.bp.json"
    );

    const warnings = issues.filter((i) => i.level === "warning");
    const errors = issues.filter((i) => i.level === "error");
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].nodeId).toBe("r1");
    expect(warnings[0].nodeIds).toEqual(["r1", "r2"]);
    expect(warnings[0].message.includes("Multiple nodes are marked as root")).toBe(true);
    expect(warnings[0].message.includes("多个节点被标记为 Root")).toBe(true);
  });

  it("returns error when exec input has multiple incoming edges", () => {
    const issues = validateBlueprintDocument(
      {
        graph: {
          nodes: [
            { id: "a", inputs: [], outputs: [{ name: "exec", type: "exec" }] },
            { id: "b", inputs: [], outputs: [{ name: "exec", type: "exec" }] },
            { id: "c", inputs: [{ name: "in", type: "exec" }], outputs: [] },
          ],
          edges: [
            { id: "e1", fromNodeId: "a", fromPin: "exec", toNodeId: "c", toPin: "in" },
            { id: "e2", fromNodeId: "b", fromPin: "exec", toNodeId: "c", toPin: "in" },
          ],
        },
      },
      "sample/exec-duplicate.bp.json"
    );

    expect(issues.some((i) => i.level === "error" && i.message.includes("multiple incoming edges"))).toBe(true);
  });

  it("returns mixed warning+error when multi-root and invalid edge both exist", () => {
    const issues = validateBlueprintDocument(
      {
        graph: {
          nodes: [
            { id: "r1", isRoot: true, inputs: [], outputs: [{ name: "exec", type: "exec" }] },
            { id: "r2", isRoot: true, inputs: [], outputs: [{ name: "exec", type: "exec" }] },
          ],
          edges: [{ id: "e-bad", fromNodeId: "r1", fromPin: "exec", toNodeId: "missing", toPin: "in" }],
        },
      },
      "sample/mixed.bp.json"
    );

    expect(issues.some((i) => i.level === "warning" && i.message.includes("Multiple nodes are marked as root"))).toBe(
      true
    );
    expect(issues.some((i) => i.level === "error" && i.message.includes("references missing node(s)"))).toBe(true);
  });
});
