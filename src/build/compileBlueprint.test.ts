import { describe, expect, it } from "vitest";
import {
  createDefaultBlueprintDocument,
  createNewDispatcherGraphBody,
  createNewFunctionGraphBody,
  NODE_VALUE_DISPATCHER_ID,
  TEMPLATE_BROADCAST_DISPATCHER,
  TEMPLATE_INVOKE_FUNCTION,
} from "../blueprint/documentModel";
import { compileBlueprintDocument } from "./compileBlueprint";

describe("compileBlueprintDocument", () => {
  it("lists invoke sites on main graph and marks resolved when target exists", () => {
    const fnBody = createNewFunctionGraphBody("fn_a", "A");
    const doc = createDefaultBlueprintDocument();
    doc.functions = [fnBody];
    const invId = "node_invoke";
    doc.graph.nodes.push({
      id: invId,
      title: "Invoke Function",
      template: TEMPLATE_INVOKE_FUNCTION,
      isRoot: false,
      x: 200,
      y: 300,
      inputs: [{ name: "exec", type: "exec" }],
      outputs: [{ name: "exec", type: "exec" }],
      values: { functionId: "fn_a" },
    });
    const c = compileBlueprintDocument(doc);
    expect(c.main.invokeSites).toHaveLength(1);
    expect(c.main.invokeSites[0].nodeId).toBe(invId);
    expect(c.main.invokeSites[0].targetFunctionId).toBe("fn_a");
    expect(c.main.invokeSites[0].resolved).toBe(true);
    expect(c.functions.fn_a.entryNodeIds.length).toBeGreaterThanOrEqual(1);
    expect(c.functions.fn_a.returnNodeIds.length).toBeGreaterThanOrEqual(1);
    expect(c.main.broadcastSites).toHaveLength(0);
    expect(Object.keys(c.dispatchers)).toHaveLength(0);
  });

  it("marks unresolved when function id is missing", () => {
    const doc = createDefaultBlueprintDocument();
    doc.graph.nodes.push({
      id: "bad",
      title: "Invoke",
      template: TEMPLATE_INVOKE_FUNCTION,
      isRoot: false,
      x: 0,
      y: 0,
      inputs: [{ name: "exec", type: "exec" }],
      outputs: [{ name: "exec", type: "exec" }],
      values: { functionId: "missing" },
    });
    const c = compileBlueprintDocument(doc);
    expect(c.main.invokeSites[0].resolved).toBe(false);
    expect(c.main.broadcastSites).toHaveLength(0);
  });

  it("lists broadcast sites and dispatcher entry ids when dispatcher exists", () => {
    const dispBody = createNewDispatcherGraphBody("on_health", "OnHealth");
    const doc = createDefaultBlueprintDocument();
    doc.dispatchers = [{ id: "on_health", name: "OnHealth", graph: dispBody }];
    doc.graph.nodes.push({
      id: "bc",
      title: "Broadcast",
      template: TEMPLATE_BROADCAST_DISPATCHER,
      x: 0,
      y: 0,
      inputs: [{ name: "exec", type: "exec" }],
      outputs: [{ name: "exec", type: "exec" }],
      values: { [NODE_VALUE_DISPATCHER_ID]: "on_health" },
    });
    const c = compileBlueprintDocument(doc);
    expect(c.main.broadcastSites).toHaveLength(1);
    expect(c.main.broadcastSites[0].targetDispatcherId).toBe("on_health");
    expect(c.main.broadcastSites[0].resolved).toBe(true);
    expect(c.dispatchers.on_health.entryNodeIds.length).toBeGreaterThanOrEqual(1);
  });
});
