import { describe, expect, it } from "vitest";
import { validateBlueprintDocument } from "./validateBlueprintDocument";

describe("validateBlueprintDocument", () => {
  it("does not emit multi-root warning (isRoot is ignored by validation)", () => {
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

    const rootWarnings = issues.filter(
      (i) => i.level === "warning" && i.message.includes("Multiple nodes are marked as root")
    );
    expect(rootWarnings).toHaveLength(0);
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

  it("returns error for invalid edge without multi-root warning", () => {
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
      false
    );
    expect(issues.some((i) => i.level === "error" && i.message.includes("references missing node(s)"))).toBe(true);
  });

  it("accepts valid graph.variables array", () => {
    const issues = validateBlueprintDocument(
      {
        graph: {
          nodes: [{ id: "a", inputs: [], outputs: [{ name: "exec", type: "exec" }] }],
          edges: [],
          variables: [
            { name: "score", type: "number" },
            { name: "title", type: "string" },
          ],
        },
      },
      "sample/with-vars.bp.json"
    );
    const errors = issues.filter((i) => i.level === "error");
    expect(errors).toHaveLength(0);
  });

  it("returns warning for duplicate variable names", () => {
    const issues = validateBlueprintDocument(
      {
        graph: {
          nodes: [{ id: "a", inputs: [], outputs: [{ name: "exec", type: "exec" }] }],
          edges: [],
          variables: [
            { name: "x", type: "number" },
            { name: "x", type: "string" },
          ],
        },
      },
      "sample/dup-vars.bp.json"
    );
    expect(issues.some((i) => i.level === "warning" && i.message.includes("Duplicate blueprint variable"))).toBe(true);
    expect(issues.filter((i) => i.level === "error")).toHaveLength(0);
  });

  it("normalizes mistaken v2 graphs[] to first graph only (no duplicate-graph error)", () => {
    const issues = validateBlueprintDocument(
      {
        formatVersion: 2,
        graphs: [
          {
            id: "g1",
            name: "A",
            kind: "event",
            nodes: [{ id: "n1", title: "N", x: 0, y: 0, inputs: [], outputs: [{ name: "o", type: "exec" }] }],
            edges: [],
          },
          {
            id: "g2",
            name: "B",
            kind: "event",
            nodes: [{ id: "n2", title: "N2", x: 0, y: 0, inputs: [], outputs: [{ name: "o", type: "exec" }] }],
            edges: [],
          },
        ],
        variables: [{ name: "v", type: "number" }],
        metadata: {},
      },
      "sample/v2-first-graph.bp.json"
    );
    expect(issues.filter((i) => i.level === "error")).toHaveLength(0);
  });

  it("validates functions[] subgraphs and rejects duplicate function ids", () => {
    const ok = validateBlueprintDocument(
      {
        graph: {
          nodes: [{ id: "a", inputs: [], outputs: [{ name: "exec", type: "exec" }] }],
          edges: [],
        },
        functions: [
          {
            id: "f1",
            name: "DoWork",
            nodes: [{ id: "fa", inputs: [], outputs: [{ name: "exec", type: "exec" }] }],
            edges: [],
            variables: [],
          },
        ],
      },
      "sample/with-fn.bp.json"
    );
    expect(ok.filter((i) => i.level === "error")).toHaveLength(0);

    const dup = validateBlueprintDocument(
      {
        graph: {
          nodes: [{ id: "a", inputs: [], outputs: [{ name: "exec", type: "exec" }] }],
          edges: [],
        },
        functions: [
          {
            id: "same",
            name: "A",
            nodes: [{ id: "x", inputs: [], outputs: [{ name: "exec", type: "exec" }] }],
            edges: [],
            variables: [],
          },
          {
            id: "same",
            name: "B",
            nodes: [{ id: "y", inputs: [], outputs: [{ name: "exec", type: "exec" }] }],
            edges: [],
            variables: [],
          },
        ],
      },
      "sample/dup-fn-id.bp.json"
    );
    expect(dup.some((i) => i.level === "error" && i.message.includes("Duplicate function id"))).toBe(true);
  });

  it("errors when invoke node references unknown function", () => {
    const issues = validateBlueprintDocument(
      {
        graph: {
          nodes: [
            { id: "a", inputs: [], outputs: [{ name: "exec", type: "exec" }] },
            {
              id: "inv",
              template: "Flow.InvokeFunction",
              inputs: [{ name: "exec", type: "exec" }],
              outputs: [{ name: "exec", type: "exec" }],
              values: { functionId: "nope" },
            },
          ],
          edges: [],
        },
        functions: [],
      },
      "sample/bad-invoke.bp.json"
    );
    expect(issues.some((i) => i.level === "error" && i.message.includes("unknown function"))).toBe(true);
  });
});
