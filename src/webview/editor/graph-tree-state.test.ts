import { describe, expect, it } from "vitest";
import {
  NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID,
  NODE_VALUE_LIFECYCLE_HOOK,
  TEMPLATE_DISPATCHER_ENTRY,
  TEMPLATE_EVENT_START,
  TEMPLATE_FUNCTION_ENTRY,
} from "../../shared/blueprint/documentModel";
import { computeNodeTreeState, type GraphTreeEdge, type GraphTreeNodeInput } from "./graph-tree-state";

const execEdge = (from: string, to: string): GraphTreeEdge => ({
  fromNodeId: from,
  toNodeId: to,
  fromPin: "exec",
  toPin: "exec",
});

const ev = (id: string, hook?: string): GraphTreeNodeInput => ({
  id,
  template: TEMPLATE_EVENT_START,
  inputs: [],
  outputs: [{ name: "exec", type: "exec" }],
  values: hook ? { [NODE_VALUE_LIFECYCLE_HOOK]: hook } : undefined,
});

const print = (id: string): GraphTreeNodeInput => ({
  id,
  template: "Debug.Print",
  inputs: [
    { name: "exec", type: "exec" },
    { name: "text", type: "string" },
  ],
  outputs: [{ name: "exec", type: "exec" }],
});

const fnEntry = (id: string): GraphTreeNodeInput => ({
  id,
  template: TEMPLATE_FUNCTION_ENTRY,
  inputs: [],
  outputs: [{ name: "exec", type: "exec" }],
});

const dispEntry = (id: string): GraphTreeNodeInput => ({
  id,
  template: TEMPLATE_DISPATCHER_ENTRY,
  inputs: [],
  outputs: [{ name: "exec", type: "exec" }],
});

describe("computeNodeTreeState", () => {
  it("main: legal when first exec-entry is Event.Start with configured lifecycle hook", () => {
    const allowed = ["onBeginPlay"];
    const state = computeNodeTreeState(
      [ev("start", "onBeginPlay"), print("p")],
      [execEdge("start", "p")],
      "main",
      allowed,
      null
    );
    expect(Array.from(state.legalNodes).sort()).toEqual(["p", "start"]);
    expect(state.illegalNodes.size).toBe(0);
    expect(state.configuredLifecycleNodeIds.has("start")).toBe(true);
    expect(state.numberById.get("start")).toBe(0);
  });

  it("main: illegal when first exec-entry is not Event.Start", () => {
    const allowed = ["onBeginPlay"];
    const state = computeNodeTreeState(
      [print("p"), ev("late", "onBeginPlay")],
      [execEdge("p", "late")],
      "main",
      allowed,
      null
    );
    expect(state.legalNodes.size).toBe(0);
    expect(Array.from(state.illegalNodes).sort()).toEqual(["late", "p"]);
  });

  it("main: illegal when hook not in base class list", () => {
    const state = computeNodeTreeState(
      [ev("start", "onFoo")],
      [],
      "main",
      ["onBeginPlay"],
      null
    );
    expect(state.legalNodes.size).toBe(0);
    expect(state.configuredLifecycleNodeIds.has("start")).toBe(false);
  });

  it("main: with empty allowed hooks, any Event.Start is a valid starter", () => {
    const state = computeNodeTreeState([ev("start"), print("p")], [execEdge("start", "p")], "main", [], null);
    expect(Array.from(state.legalNodes).sort()).toEqual(["p", "start"]);
    expect(state.configuredLifecycleNodeIds.size).toBe(0);
  });

  it("function: legal when first exec-entry is Function Entry", () => {
    const state = computeNodeTreeState(
      [fnEntry("e"), print("p")],
      [execEdge("e", "p")],
      "function",
      [],
      null
    );
    expect(Array.from(state.legalNodes).sort()).toEqual(["e", "p"]);
    expect(state.configuredLifecycleNodeIds.size).toBe(0);
  });

  it("dispatcher: legal when first exec-entry is Dispatcher Entry", () => {
    const state = computeNodeTreeState(
      [dispEntry("e"), print("p")],
      [execEdge("e", "p")],
      "dispatcher",
      [],
      null
    );
    expect(Array.from(state.legalNodes).sort()).toEqual(["e", "p"]);
    expect(state.configuredLifecycleNodeIds.size).toBe(0);
  });

  it("partitions two disconnected components by their own first exec-entry", () => {
    const allowed = ["onBeginPlay", "onTick"];
    const state = computeNodeTreeState(
      [
        ev("a", "onBeginPlay"),
        print("x"),
        ev("b", "onTick"),
        print("y"),
      ],
      [execEdge("a", "x"), execEdge("b", "y")],
      "main",
      allowed,
      null
    );
    expect(Array.from(state.legalNodes).sort()).toEqual(["a", "b", "x", "y"]);
    expect(state.illegalNodes.size).toBe(0);
  });

  it("cycle component has no exec-entry → illegal", () => {
    const state = computeNodeTreeState(
      [print("a"), print("b"), print("c")],
      [execEdge("a", "b"), execEdge("b", "c"), execEdge("c", "a")],
      "main",
      [],
      null
    );
    expect(state.legalNodes.size).toBe(0);
    expect(Array.from(state.illegalNodes).sort()).toEqual(["a", "b", "c"]);
  });

  it("isolated Event.Start with allowed hook is legal", () => {
    const state = computeNodeTreeState([ev("solo", "onBeginPlay")], [], "main", ["onBeginPlay"], null);
    expect(Array.from(state.legalNodes)).toEqual(["solo"]);
  });

  const LISTEN_TPL = "Engine.GlobalEvent.Listen";
  const globalListen = (id: string, channel: string): GraphTreeNodeInput => ({
    id,
    template: LISTEN_TPL,
    inputs: [],
    outputs: [{ name: "exec", type: "exec" }],
    values: { [NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID]: channel },
  });

  it("main: global event Listen with manifest channel is legal tree start", () => {
    const state = computeNodeTreeState(
      [globalListen("g", "game.pause"), print("p")],
      [execEdge("g", "p")],
      "main",
      [],
      { listenTemplate: LISTEN_TPL, allowedChannelIds: ["game.pause"] }
    );
    expect(Array.from(state.legalNodes).sort()).toEqual(["g", "p"]);
    expect(state.globalEventListenNodeIds.has("g")).toBe(true);
  });
});
