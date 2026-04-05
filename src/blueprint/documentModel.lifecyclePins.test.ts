import { describe, expect, it } from "vitest";
import {
  blueprintPinsEqual,
  createDefaultBlueprintDocument,
  createNewFunctionGraphBody,
  getInvokePinsForFunctionDoc,
  mergeEventStartPinsForLifecycle,
  TEMPLATE_FUNCTION_ENTRY,
  TEMPLATE_FUNCTION_RETURN,
} from "./documentModel";

describe("mergeEventStartPinsForLifecycle", () => {
  it("appends hook outputs after template and keeps exec first", () => {
    const { inputs, outputs } = mergeEventStartPinsForLifecycle(
      [],
      [{ name: "exec", type: "exec" }],
      { outputs: [{ name: "deltaTime", type: "number" }] }
    );
    expect(inputs).toEqual([]);
    expect(outputs.map((p) => p.name)).toEqual(["exec", "deltaTime"]);
  });

  it("template wins on output name collision", () => {
    const { outputs } = mergeEventStartPinsForLifecycle(
      [],
      [
        { name: "exec", type: "exec" },
        { name: "x", type: "number" },
      ],
      { outputs: [{ name: "x", type: "string" }] }
    );
    const x = outputs.find((p) => p.name === "x");
    expect(x?.type).toBe("number");
  });

  it("inputs come only from Event.Start template, not from lifecycle hook", () => {
    const { inputs } = mergeEventStartPinsForLifecycle(
      [{ name: "a", type: "exec" }],
      [{ name: "exec", type: "exec" }],
      { outputs: [] }
    );
    expect(inputs.map((p) => p.name)).toEqual(["a"]);
  });
});

describe("blueprintPinsEqual", () => {
  it("compares order-sensitive", () => {
    expect(
      blueprintPinsEqual(
        [
          { name: "exec", type: "exec" },
          { name: "a", type: "number" },
        ],
        [
          { name: "exec", type: "exec" },
          { name: "a", type: "number" },
        ]
      )
    ).toBe(true);
    expect(
      blueprintPinsEqual(
        [
          { name: "a", type: "number" },
          { name: "exec", type: "exec" },
        ],
        [
          { name: "exec", type: "exec" },
          { name: "a", type: "number" },
        ]
      )
    ).toBe(false);
  });
});

describe("getInvokePinsForFunctionDoc", () => {
  it("maps Function Entry payload outputs to invoke inputs side and Return payload inputs to invoke outputs side", () => {
    const doc = createDefaultBlueprintDocument();
    const fn = createNewFunctionGraphBody("fn_a", "A");
    const entryId = fn.nodes.find((n) => n.template === TEMPLATE_FUNCTION_ENTRY)!.id;
    const retId = fn.nodes.find((n) => n.template === TEMPLATE_FUNCTION_RETURN)!.id;
    fn.nodes = fn.nodes.map((n) => {
      if (n.id === entryId) {
        return { ...n, outputs: [...n.outputs, { name: "hp", type: "number" }] };
      }
      if (n.id === retId) {
        return { ...n, inputs: [...n.inputs, { name: "ok", type: "boolean" }] };
      }
      return n;
    });
    doc.functions = [fn];
    const sig = getInvokePinsForFunctionDoc(doc, "fn_a");
    expect(sig.inputs.map((p) => p.name)).toEqual(["hp"]);
    expect(sig.outputs.map((p) => p.name)).toEqual(["ok"]);
  });
});
