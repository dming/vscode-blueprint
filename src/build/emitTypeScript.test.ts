import { describe, expect, it } from "vitest";
import {
  createDefaultBlueprintDocument,
  createNewFunctionGraphBody,
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
});
