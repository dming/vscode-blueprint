import { describe, expect, it } from "vitest";
import { validateConnectionHintKey } from "./graph-validation";
import { translateUiText } from "./ui-text";

describe("localized hint triggers", () => {
  it("triggers pin type mismatch hint key and translations", () => {
    const hintKey = validateConnectionHintKey(
      {
        nodes: [
          { id: "a", inputs: [], outputs: [{ name: "out", type: "exec" }] },
          { id: "b", inputs: [{ name: "in", type: "string" }], outputs: [] },
        ],
        edges: [],
      },
      { fromNodeId: "a", fromPin: "out" },
      "b",
      "in"
    );
    expect(hintKey).toBe("connectionPinTypeMismatch");
    expect(translateUiText("connectionPinTypeMismatch", "en", { from: "exec", to: "string" })).toBe(
      "Pin type mismatch: exec -> string."
    );
    expect(translateUiText("connectionPinTypeMismatch", "zh-CN", { from: "exec", to: "string" })).toBe(
      "Pin 类型不匹配：exec -> string。"
    );
  });

  it("triggers duplicate-edge hint key and translations", () => {
    const hintKey = validateConnectionHintKey(
      {
        nodes: [
          { id: "a", inputs: [], outputs: [{ name: "out", type: "exec" }] },
          { id: "b", inputs: [{ name: "in", type: "exec" }], outputs: [] },
        ],
        edges: [{ fromNodeId: "a", fromPin: "out", toNodeId: "b", toPin: "in" }],
      },
      { fromNodeId: "a", fromPin: "out" },
      "b",
      "in"
    );
    expect(hintKey).toBe("connectionAlreadyExists");
    expect(translateUiText("connectionAlreadyExists", "en")).toBe("Connection already exists.");
    expect(translateUiText("connectionAlreadyExists", "zh-CN")).toBe("连线已存在。");
  });

  it("triggers exec-input-single-incoming hint key and translations", () => {
    const hintKey = validateConnectionHintKey(
      {
        nodes: [
          { id: "a", inputs: [], outputs: [{ name: "out", type: "exec" }] },
          { id: "c", inputs: [], outputs: [{ name: "out", type: "exec" }] },
          { id: "b", inputs: [{ name: "in", type: "exec" }], outputs: [] },
        ],
        edges: [{ fromNodeId: "c", fromPin: "out", toNodeId: "b", toPin: "in" }],
      },
      { fromNodeId: "a", fromPin: "out" },
      "b",
      "in"
    );
    expect(hintKey).toBe("connectionExecInputAlreadyConnected");
    expect(
      translateUiText("connectionExecInputAlreadyConnected", "en", {
        nodeId: "b",
        pinName: "in",
      })
    ).toBe("Exec input 'b.in' already has an incoming edge.");
    expect(
      translateUiText("connectionExecInputAlreadyConnected", "zh-CN", {
        nodeId: "b",
        pinName: "in",
      })
    ).toBe("Exec 输入 'b.in' 已有一条输入连线。");
  });

  it("triggers missing-node hint key and translations", () => {
    const hintKey = validateConnectionHintKey(
      {
        nodes: [{ id: "a", inputs: [], outputs: [{ name: "out", type: "exec" }] }],
        edges: [],
      },
      { fromNodeId: "a", fromPin: "out" },
      "missing",
      "in"
    );
    expect(hintKey).toBe("connectionSourceOrTargetNodeMissing");
    expect(translateUiText("connectionSourceOrTargetNodeMissing", "en")).toBe(
      "Source or target node does not exist."
    );
    expect(translateUiText("connectionSourceOrTargetNodeMissing", "zh-CN")).toBe(
      "源节点或目标节点不存在。"
    );
  });

  it("triggers missing-pin hint key and translations", () => {
    const hintKey = validateConnectionHintKey(
      {
        nodes: [
          { id: "a", inputs: [], outputs: [{ name: "out", type: "exec" }] },
          { id: "b", inputs: [{ name: "in", type: "exec" }], outputs: [] },
        ],
        edges: [],
      },
      { fromNodeId: "a", fromPin: "not-exists" },
      "b",
      "in"
    );
    expect(hintKey).toBe("connectionSourceOrTargetPinMissing");
    expect(translateUiText("connectionSourceOrTargetPinMissing", "en")).toBe(
      "Source or target pin does not exist."
    );
    expect(translateUiText("connectionSourceOrTargetPinMissing", "zh-CN")).toBe(
      "源 Pin 或目标 Pin 不存在。"
    );
  });
});
