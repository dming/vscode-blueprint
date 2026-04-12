import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { parseBlueprintDocumentJson } from "../../shared/blueprint/documentModel";
import { documentToRuntimeAsset } from "./documentToRuntimeAsset";

const repoRoot = path.resolve(__dirname, "../../..");
const sampleMain = path.join(repoRoot, "sample", "main.bp.json");

const minimalGraph = (nodes: unknown[], edges: unknown[]) =>
  JSON.stringify({
    formatVersion: 1,
    inherits: "Component",
    graph: {
      id: "main",
      name: "test",
      nodes,
      edges,
      variables: [],
    },
  });

describe("documentToRuntimeAsset", () => {
  it("converts onStart → Debug.Print chain from sample/main.bp.json", () => {
    const text = fs.readFileSync(sampleMain, "utf-8");
    const doc = parseBlueprintDocumentJson(text);
    expect(doc.inherits).toBe("Component");
    const r = documentToRuntimeAsset(doc, { lifecycleHook: "onStart" });
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect(r.asset._$ver).toBe(1);
    expect(r.asset.extends).toBe("Component");
    const arr = r.asset.blueprintArr?.main?.arr;
    expect(Array.isArray(arr)).toBe(true);
    expect(arr!.length).toBe(2);
    expect(arr![0].cid).toBe("event_onStart");
    expect(arr![0].target).toBe("Component");
    expect(arr![1].cid).toBe("web_consoleLog");
    expect((arr![1].inputValue as { text?: string })?.text).toContain("Hello from Blueprint sample");
  });

  it("rejects exec cycles in the main graph", () => {
    const pinIo = {
      inputs: [{ name: "exec", type: "exec" }],
      outputs: [{ name: "exec", type: "exec" }],
    };
    const textIo = {
      inputs: [
        { name: "exec", type: "exec" },
        { name: "text", type: "string" },
      ],
      outputs: [{ name: "exec", type: "exec" }],
    };
    const doc = parseBlueprintDocumentJson(
      minimalGraph(
        [
          {
            id: "n1",
            title: "Start",
            x: 0,
            y: 0,
            ...pinIo,
            template: "Event.Start",
            values: { lifecycleHook: "onStart" },
          },
          {
            id: "n2",
            title: "PrintA",
            x: 0,
            y: 0,
            ...textIo,
            template: "Debug.Print",
            values: { text: "a" },
          },
          {
            id: "n3",
            title: "PrintB",
            x: 0,
            y: 0,
            ...textIo,
            template: "Debug.Print",
            values: { text: "b" },
          },
        ],
        [
          { id: "e1", fromNodeId: "n1", fromPin: "exec", toNodeId: "n2", toPin: "exec" },
          { id: "e2", fromNodeId: "n2", fromPin: "exec", toNodeId: "n3", toPin: "exec" },
          { id: "e3", fromNodeId: "n3", fromPin: "exec", toNodeId: "n2", toPin: "exec" },
        ],
      ),
    );
    const r = documentToRuntimeAsset(doc, { lifecycleHook: "onStart" });
    expect(r.ok).toBe(false);
    if (r.ok) {
      return;
    }
    expect(r.error).toContain("Cycle");
  });

  it("rejects unsupported templates after Event.Start in the MVP chain", () => {
    const pinIo = {
      inputs: [{ name: "exec", type: "exec" }],
      outputs: [{ name: "exec", type: "exec" }],
    };
    const doc = parseBlueprintDocumentJson(
      minimalGraph(
        [
          {
            id: "n1",
            title: "Start",
            x: 0,
            y: 0,
            ...pinIo,
            template: "Event.Start",
            values: { lifecycleHook: "onStart" },
          },
          {
            id: "n2",
            title: "NotPrint",
            x: 0,
            y: 0,
            inputs: [
              { name: "exec", type: "exec" },
              { name: "condition", type: "boolean" },
            ],
            outputs: [
              { name: "exec", type: "exec" },
              { name: "true", type: "exec" },
              { name: "false", type: "exec" },
            ],
            template: "Flow.Branch",
            values: {},
          },
        ],
        [{ id: "e1", fromNodeId: "n1", fromPin: "exec", toNodeId: "n2", toPin: "exec" }],
      ),
    );
    const r = documentToRuntimeAsset(doc, { lifecycleHook: "onStart" });
    expect(r.ok).toBe(false);
    if (r.ok) {
      return;
    }
    expect(r.error).toMatch(/Unsupported node template/i);
  });

  it("rejects multiple exec edges from the same node", () => {
    const pinIo = {
      inputs: [{ name: "exec", type: "exec" }],
      outputs: [{ name: "exec", type: "exec" }],
    };
    const textIo = {
      inputs: [
        { name: "exec", type: "exec" },
        { name: "text", type: "string" },
      ],
      outputs: [{ name: "exec", type: "exec" }],
    };
    const doc = parseBlueprintDocumentJson(
      minimalGraph(
        [
          {
            id: "n1",
            title: "Start",
            x: 0,
            y: 0,
            ...pinIo,
            template: "Event.Start",
            values: { lifecycleHook: "onStart" },
          },
          {
            id: "n2",
            title: "PrintA",
            x: 0,
            y: 0,
            ...textIo,
            template: "Debug.Print",
            values: { text: "a" },
          },
          {
            id: "n3",
            title: "PrintB",
            x: 0,
            y: 0,
            ...textIo,
            template: "Debug.Print",
            values: { text: "b" },
          },
        ],
        [
          { id: "e1", fromNodeId: "n1", fromPin: "exec", toNodeId: "n2", toPin: "exec" },
          { id: "e2", fromNodeId: "n1", fromPin: "exec", toNodeId: "n3", toPin: "exec" },
        ],
      ),
    );
    const r = documentToRuntimeAsset(doc, { lifecycleHook: "onStart" });
    expect(r.ok).toBe(false);
    if (r.ok) {
      return;
    }
    expect(r.error).toMatch(/Multiple exec edges/i);
  });
});
