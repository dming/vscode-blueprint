import { describe, expect, it } from "vitest";
import {
  createDefaultBlueprintDocument,
  createNewDispatcherGraphBody,
  createNewFunctionGraphBody,
  NODE_VALUE_DISPATCHER_ID,
  NODE_VALUE_FUNCTION_ID,
  NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID,
  TEMPLATE_BIND_DISPATCHER_LISTENER,
  TEMPLATE_BROADCAST_DISPATCHER,
  TEMPLATE_INVOKE_FUNCTION,
} from "../blueprint/documentModel";
import { emitTypeScriptFromBlueprint } from "./emitTypeScript";

describe("emitTypeScriptFromBlueprint", () => {
  it("emits run_* with console.log for Debug.Print / Print-style nodes", () => {
    const doc = createDefaultBlueprintDocument();
    const ts = emitTypeScriptFromBlueprint(doc, {
      sourceRelPath: "sample/main.bp.json",
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(ts).toContain("export async function run_Main");
    expect(ts).toContain("console.log");
    expect(ts).toContain("BlueprintRuntimeContext");
    expect(ts).toContain("dispatchers: {}");
    expect(ts).toContain("dispatcherListeners: {}");
    expect(ts).toContain("globalEvents");
    expect(ts).toContain("export default run_Main");
  });

  it("emits fn_* and await for resolved InvokeFunction on main graph", () => {
    const doc = createDefaultBlueprintDocument();
    const fn = createNewFunctionGraphBody("fn_x", "X");
    doc.functions = [fn];
    doc.graph.nodes.push({
      id: "inv1",
      title: "Invoke",
      template: TEMPLATE_INVOKE_FUNCTION,
      isRoot: false,
      x: 200,
      y: 200,
      inputs: [{ name: "exec", type: "exec" }],
      outputs: [{ name: "exec", type: "exec" }],
      values: { functionId: "fn_x" },
    });
    const ts = emitTypeScriptFromBlueprint(doc, {
      sourceRelPath: "t.bp.json",
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(ts).toContain("export async function fn_x");
    expect(ts).toContain("await fn_x(ctx)");
  });

  it("emits dispatch_* for dispatcher graphs, await broadcast, and wires createBlueprintContext", () => {
    const doc = createDefaultBlueprintDocument();
    const dg = createNewDispatcherGraphBody("dmg", "Damage");
    doc.dispatchers = [{ id: "dmg", name: "Damage", graph: dg }];
    doc.graph.nodes.push({
      id: "b1",
      title: "B",
      template: TEMPLATE_BROADCAST_DISPATCHER,
      x: 0,
      y: 0,
      inputs: [{ name: "exec", type: "exec" }],
      outputs: [{ name: "exec", type: "exec" }],
      values: { [NODE_VALUE_DISPATCHER_ID]: "dmg" },
    });
    const ts = emitTypeScriptFromBlueprint(doc, {
      sourceRelPath: "t.bp.json",
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(ts).toContain("export async function dispatch_dmg");
    expect(ts).toContain("await ctx.dispatchers.dmg(ctx)");
    expect(ts).toContain("ctx.dispatcherListeners.dmg");
    expect(ts).toContain("dmg: (ctx) => dispatch_dmg(ctx)");
    expect(ts).toContain("dmg: []");
  });

  it("emits BindDispatcherListener as push onto dispatcherListeners", () => {
    const doc = createDefaultBlueprintDocument();
    const dg = createNewDispatcherGraphBody("evt", "Evt");
    const fn = createNewFunctionGraphBody("fn_x", "X");
    doc.dispatchers = [{ id: "evt", name: "Evt", graph: dg }];
    doc.functions = [fn];
    doc.graph.nodes.push({
      id: "bind1",
      title: "Bind",
      template: TEMPLATE_BIND_DISPATCHER_LISTENER,
      x: 0,
      y: 0,
      inputs: [{ name: "exec", type: "exec" }],
      outputs: [{ name: "exec", type: "exec" }],
      values: { [NODE_VALUE_DISPATCHER_ID]: "evt", [NODE_VALUE_FUNCTION_ID]: "fn_x" },
    });
    const ts = emitTypeScriptFromBlueprint(doc, {
      sourceRelPath: "t.bp.json",
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(ts).toContain("ctx.dispatcherListeners.evt.push((c) => fn_x(c))");
  });

  it("emits globalEvents.emit when global emit template and channel are set", () => {
    const EMIT = "Engine.GlobalEvent.Emit";
    const doc = createDefaultBlueprintDocument();
    doc.graph.nodes.push({
      id: "ge1",
      title: "Emit",
      template: EMIT,
      x: 0,
      y: 0,
      inputs: [{ name: "exec", type: "exec" }],
      outputs: [{ name: "exec", type: "exec" }],
      values: { [NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID]: "game.pause" },
    });
    const ts = emitTypeScriptFromBlueprint(doc, {
      sourceRelPath: "t.bp.json",
      generatedAt: "2026-01-01T00:00:00.000Z",
      globalEventEmitTemplate: EMIT,
      globalEventListenTemplate: "Engine.GlobalEvent.Listen",
    });
    expect(ts).toContain('await ctx.globalEvents.emit("game.pause", {})');
  });
});
