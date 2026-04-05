/**
 * Blueprint document: primary `graph` (event / main graph) plus optional `functions[]` and `dispatchers[]` (each is its own subgraph).
 * Optional `inherits` names a base class from blueprint.config.json `baseClasses` (declared lifecycle hooks).
 * Extra hooks appear when main-graph `Event.Start` nodes set `values.lifecycleHook`.
 * Legacy v2 `graphs[]`: first entry becomes `graph`; entries with `kind: "function"` are merged into `functions`.
 */

export type BlueprintPin = { name: string; type: string };

export type BlueprintNode = {
  id: string;
  title: string;
  /** Node definition name from blueprint.config.json (e.g. `Flow.InvokeFunction`). */
  template?: string;
  description?: string;
  isRoot?: boolean;
  x: number;
  y: number;
  inputs: BlueprintPin[];
  outputs: BlueprintPin[];
  values?: Record<string, string>;
};

/** Node definition names used by the editor and compiler. */
export const TEMPLATE_FUNCTION_ENTRY = "Flow.FunctionEntry";
export const TEMPLATE_FUNCTION_RETURN = "Flow.FunctionReturn";
export const TEMPLATE_INVOKE_FUNCTION = "Flow.InvokeFunction";
/** Listener subgraph entry; payload outputs drive `Flow.BroadcastDispatcher` input pins on other graphs. */
export const TEMPLATE_DISPATCHER_ENTRY = "Flow.DispatcherEntry";
/** Broadcast a named dispatcher from main or function graphs (`values.dispatcherId`). */
export const TEMPLATE_BROADCAST_DISPATCHER = "Flow.BroadcastDispatcher";
/** At runtime, append a function as an extra listener for a dispatcher (`values.dispatcherId`, `values.functionId`). */
export const TEMPLATE_BIND_DISPATCHER_LISTENER = "Flow.BindDispatcherListener";
/** Clear dynamically bound listeners for a dispatcher (static `dispatch_*` graph still runs on broadcast). */
export const TEMPLATE_CLEAR_DISPATCHER_LISTENERS = "Flow.ClearDispatcherListeners";
/** Main graph entry node; pin layout comes from blueprint.config.json `Event.Start`. */
export const TEMPLATE_EVENT_START = "Event.Start";

/**
 * When set on an `Event.Start` node's `values`, ties the node to a lifecycle hook name in the explorer.
 * Custom hooks are listed from the main graph by scanning nodes with this value.
 */
export const NODE_VALUE_LIFECYCLE_HOOK = "lifecycleHook";
/** `Flow.BroadcastDispatcher` targets `BlueprintDispatcher.id`. */
export const NODE_VALUE_DISPATCHER_ID = "dispatcherId";
/** `Flow.InvokeFunction` / `Flow.BindDispatcherListener` target `BlueprintFunction.id`. */
export const NODE_VALUE_FUNCTION_ID = "functionId";
/** Global cross-blueprint event channel id (`Engine.GlobalEvent.*` nodes, from blueprint.config.json manifest). */
export const NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID = "channelId";

const TEMPLATES_WITH_DISPATCHER_TARGET = new Set<string>([
  TEMPLATE_BROADCAST_DISPATCHER,
  TEMPLATE_BIND_DISPATCHER_LISTENER,
  TEMPLATE_CLEAR_DISPATCHER_LISTENERS,
]);

export const collectLifecycleHookNamesFromGraph = (graph: BlueprintGraphBody): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of graph.nodes) {
    if (n.template !== TEMPLATE_EVENT_START) {
      continue;
    }
    const raw = n.values?.[NODE_VALUE_LIFECYCLE_HOOK];
    const v = typeof raw === "string" ? raw.trim() : "";
    if (!v || seen.has(v)) {
      continue;
    }
    seen.add(v);
    out.push(v);
  }
  return out;
};

export const blueprintPinsEqual = (a: readonly BlueprintPin[], b: readonly BlueprintPin[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i].name !== b[i].name || a[i].type !== b[i].type) {
      return false;
    }
  }
  return true;
};

/**
 * Merge `Event.Start` pins from the node template with optional outputs declared on the lifecycle hook in config.
 * Inputs always follow the template only. Exec output stays first; template pins win on name collision with hook pins.
 */
export const mergeEventStartPinsForLifecycle = (
  templateInputs: readonly BlueprintPin[],
  templateOutputs: readonly BlueprintPin[],
  hook: { readonly outputs: readonly BlueprintPin[] }
): { inputs: BlueprintPin[]; outputs: BlueprintPin[] } => {
  const outByName = new Map<string, BlueprintPin>();
  const outOrder: string[] = [];

  const pushOut = (p: BlueprintPin) => {
    if (outByName.has(p.name)) {
      return;
    }
    outByName.set(p.name, { name: p.name, type: p.type });
    outOrder.push(p.name);
  };

  for (const p of templateOutputs) {
    pushOut(p);
  }
  for (const p of hook.outputs) {
    pushOut(p);
  }

  let outputs = outOrder.map((n) => outByName.get(n)!);
  const execIdx = outputs.findIndex((p) => p.type === "exec");
  if (execIdx > 0) {
    const [execPin] = outputs.splice(execIdx, 1);
    outputs = [execPin, ...outputs];
  } else if (execIdx === -1) {
    outputs = [{ name: "exec", type: "exec" }, ...outputs];
  }

  const inputs = templateInputs.map((p) => ({ name: p.name, type: p.type }));
  return { inputs, outputs };
};

export const mergeLifecycleHookLists = (configHooks: readonly string[], graphHooks: readonly string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of configHooks) {
    const t = h.trim();
    if (!t || seen.has(t)) {
      continue;
    }
    seen.add(t);
    out.push(t);
  }
  for (const h of graphHooks) {
    const t = h.trim();
    if (!t || seen.has(t)) {
      continue;
    }
    seen.add(t);
    out.push(t);
  }
  return out;
};

export const findEventStartNodeIdForLifecycleHook = (graph: BlueprintGraphBody, hookName: string): string | null => {
  const want = hookName.trim();
  if (!want) {
    return null;
  }
  for (const n of graph.nodes) {
    if (n.template !== TEMPLATE_EVENT_START) {
      continue;
    }
    const raw = n.values?.[NODE_VALUE_LIFECYCLE_HOOK];
    const v = typeof raw === "string" ? raw.trim() : "";
    if (v === want) {
      return n.id;
    }
  }
  return null;
};

export type BlueprintEdge = {
  id: string;
  fromNodeId: string;
  fromPin: string;
  toNodeId: string;
  toPin: string;
};

export type BlueprintVariable = { name: string; type: string };

export type BlueprintGraphBody = {
  id: string;
  name: string;
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
  variables: BlueprintVariable[];
};

/** Named event dispatcher with its listener subgraph (`Flow.DispatcherEntry` defines payload outputs). */
export type BlueprintDispatcher = {
  id: string;
  name: string;
  graph: BlueprintGraphBody;
};

export type BlueprintDocument = {
  formatVersion: number;
  graph: BlueprintGraphBody;
  /** User-defined function graphs (editable subgraphs). */
  functions: BlueprintGraphBody[];
  /** User-defined event dispatcher listener graphs. */
  dispatchers: BlueprintDispatcher[];
  /** Base class name; must match a key in blueprint.config.json `baseClasses`. */
  inherits?: string;
  metadata: Record<string, unknown>;
};

/** What the canvas is currently editing: main graph, a function graph, or a dispatcher graph. */
export type EditTarget =
  | { kind: "main" }
  | { kind: "function"; id: string }
  | { kind: "dispatcher"; id: string };

export const getGraphBody = (doc: BlueprintDocument, target: EditTarget): BlueprintGraphBody => {
  if (target.kind === "main") {
    return doc.graph;
  }
  if (target.kind === "function") {
    const f = doc.functions.find((x) => x.id === target.id);
    return f ?? doc.graph;
  }
  const d = doc.dispatchers.find((x) => x.id === target.id);
  return d?.graph ?? doc.graph;
};

/** New function graph with entry → return chain (empty body between for user nodes). */
export const createNewFunctionGraphBody = (functionId: string, displayName: string): BlueprintGraphBody => {
  const suf = Math.random().toString(36).slice(2, 7);
  const entryId = `fn_entry_${suf}`;
  const retId = `fn_return_${suf}`;
  return {
    id: functionId,
    name: displayName,
    variables: [],
    nodes: [
      {
        id: entryId,
        title: "Function Entry",
        template: TEMPLATE_FUNCTION_ENTRY,
        isRoot: true,
        x: 100,
        y: 120,
        inputs: [],
        outputs: [{ name: "exec", type: "exec" }],
      },
      {
        id: retId,
        title: "Return",
        template: TEMPLATE_FUNCTION_RETURN,
        x: 520,
        y: 120,
        inputs: [{ name: "exec", type: "exec" }],
        outputs: [],
      },
    ],
    edges: [
      {
        id: `${entryId}:exec->${retId}:exec`,
        fromNodeId: entryId,
        fromPin: "exec",
        toNodeId: retId,
        toPin: "exec",
      },
    ],
  };
};

/** New dispatcher listener graph with a single `Flow.DispatcherEntry` root. */
export const createNewDispatcherGraphBody = (dispatcherId: string, displayName: string): BlueprintGraphBody => {
  const suf = Math.random().toString(36).slice(2, 7);
  const entryId = `disp_entry_${suf}`;
  return {
    id: dispatcherId,
    name: displayName,
    variables: [],
    nodes: [
      {
        id: entryId,
        title: "Dispatcher Entry",
        template: TEMPLATE_DISPATCHER_ENTRY,
        isRoot: true,
        x: 100,
        y: 120,
        inputs: [],
        outputs: [{ name: "exec", type: "exec" }],
      },
    ],
    edges: [],
  };
};

/** First `Flow.DispatcherEntry` in a graph, if any. */
export const findDispatcherEntryNode = (graph: BlueprintGraphBody): BlueprintNode | null => {
  const entries = graph.nodes.filter((n) => n.template === TEMPLATE_DISPATCHER_ENTRY);
  return entries[0] ?? null;
};

/** First `Flow.FunctionEntry` in a function graph, if any. */
export const findFunctionEntryNode = (graph: BlueprintGraphBody): BlueprintNode | null => {
  const entries = graph.nodes.filter((n) => n.template === TEMPLATE_FUNCTION_ENTRY);
  return entries[0] ?? null;
};

/** First `Flow.FunctionReturn` in a function graph, if any. */
export const findFunctionReturnNode = (graph: BlueprintGraphBody): BlueprintNode | null => {
  const nodes = graph.nodes.filter((n) => n.template === TEMPLATE_FUNCTION_RETURN);
  return nodes[0] ?? null;
};

/** Non-exec outputs on the dispatcher entry (payload signature). */
export const getDispatcherEntryPayloadOutputs = (entry: BlueprintNode): BlueprintPin[] =>
  (entry.outputs ?? []).filter((p) => p.type !== "exec");

/** Non-exec outputs on function entry = caller → callee parameters (Invoke node inputs). */
export const getFunctionEntryPayloadOutputs = (entry: BlueprintNode | null): BlueprintPin[] => {
  if (!entry) {
    return [];
  }
  return (entry.outputs ?? []).filter((p) => p.type !== "exec");
};

/** Non-exec inputs on function return = callee → caller return values (Invoke node outputs). */
export const getFunctionReturnPayloadInputs = (ret: BlueprintNode | null): BlueprintPin[] => {
  if (!ret) {
    return [];
  }
  return (ret.inputs ?? []).filter((p) => p.type !== "exec");
};

/**
 * Payload sides for `Flow.InvokeFunction` when targeting `functionId`: entry outputs (in) and return inputs (out).
 * Empty if the function is missing or has no entry/return.
 */
export const getInvokePinsForFunctionDoc = (
  doc: BlueprintDocument,
  functionId: string
): { inputs: BlueprintPin[]; outputs: BlueprintPin[] } => {
  const want = functionId.trim();
  if (!want) {
    return { inputs: [], outputs: [] };
  }
  const f = doc.functions.find((x) => x.id === want);
  if (!f) {
    return { inputs: [], outputs: [] };
  }
  const entry = findFunctionEntryNode(f);
  const ret = findFunctionReturnNode(f);
  return {
    inputs: getFunctionEntryPayloadOutputs(entry),
    outputs: getFunctionReturnPayloadInputs(ret),
  };
};

/**
 * Merge nodeDef inputs for Broadcast with payload pins (same names/types as dispatcher entry outputs).
 * Template pins win on name collision; exec stays first.
 */
export const mergeBroadcastDispatcherInputs = (
  templateInputs: readonly BlueprintPin[],
  payloadOutputPins: readonly BlueprintPin[]
): BlueprintPin[] => {
  const byName = new Map<string, BlueprintPin>();
  const order: string[] = [];
  const add = (p: BlueprintPin) => {
    if (byName.has(p.name)) {
      return;
    }
    byName.set(p.name, { name: p.name, type: p.type });
    order.push(p.name);
  };
  for (const p of templateInputs) {
    add(p);
  }
  for (const p of payloadOutputPins) {
    if (p.type === "exec") {
      continue;
    }
    add({ name: p.name, type: p.type });
  }
  let list = order.map((n) => byName.get(n)!);
  const execIdx = list.findIndex((p) => p.type === "exec");
  if (execIdx > 0) {
    const [execPin] = list.splice(execIdx, 1);
    list = [execPin, ...list];
  } else if (execIdx === -1) {
    list = [{ name: "exec", type: "exec" }, ...list];
  }
  return list;
};

/** Payload pins for a `globalEventChannels[]` entry (by channel id). */
export const getGlobalEventPayloadPinsForChannel = (
  channels: readonly { id: string; payload: readonly BlueprintPin[] }[],
  channelId: string
): BlueprintPin[] => {
  const want = channelId.trim();
  if (!want) {
    return [];
  }
  const c = channels.find((x) => x.id === want);
  return c ? c.payload.map((p) => ({ name: p.name, type: p.type })) : [];
};

/** Merge config channel payload into global listen entry outputs (exec stays first). */
export const mergeGlobalEventListenOutputs = (
  templateOutputs: readonly BlueprintPin[],
  channelPayload: readonly BlueprintPin[]
): BlueprintPin[] =>
  mergeEventStartPinsForLifecycle([], templateOutputs, {
    name: "__globalEvent",
    outputs: channelPayload,
  }).outputs;

export const getDispatcherPayloadOutputsForDoc = (doc: BlueprintDocument, dispatcherId: string): BlueprintPin[] => {
  const want = dispatcherId.trim();
  if (!want) {
    return [];
  }
  const d = doc.dispatchers.find((x) => x.id === want);
  if (!d) {
    return [];
  }
  const entry = findDispatcherEntryNode(d.graph);
  if (!entry) {
    return [];
  }
  return getDispatcherEntryPayloadOutputs(entry);
};

/** Clear `functionId` on invoke / bind nodes that pointed at a removed function (all graphs). */
export const stripInvokeReferencesToFunction = (doc: BlueprintDocument, removedFunctionId: string): BlueprintDocument => {
  const stripGraph = (g: BlueprintGraphBody): BlueprintGraphBody => ({
    ...g,
    nodes: g.nodes.map((n) => {
      if (n.template !== TEMPLATE_INVOKE_FUNCTION && n.template !== TEMPLATE_BIND_DISPATCHER_LISTENER) {
        return n;
      }
      const cur = (n.values?.[NODE_VALUE_FUNCTION_ID] ?? "").trim();
      if (cur !== removedFunctionId) {
        return n;
      }
      const values = { ...(n.values ?? {}) };
      delete values[NODE_VALUE_FUNCTION_ID];
      return {
        ...n,
        values: Object.keys(values).length > 0 ? values : undefined,
      };
    }),
  });
  return {
    ...doc,
    graph: stripGraph(doc.graph),
    functions: doc.functions.map(stripGraph),
    dispatchers: doc.dispatchers.map((d) => ({ ...d, graph: stripGraph(d.graph) })),
  };
};

/** Clear `dispatcherId` on broadcast / bind / clear nodes that pointed at a removed dispatcher (all graphs). */
export const stripBroadcastReferencesToDispatcher = (
  doc: BlueprintDocument,
  removedDispatcherId: string
): BlueprintDocument => {
  const stripGraph = (g: BlueprintGraphBody): BlueprintGraphBody => ({
    ...g,
    nodes: g.nodes.map((n) => {
      if (!n.template || !TEMPLATES_WITH_DISPATCHER_TARGET.has(n.template)) {
        return n;
      }
      const cur = (n.values?.[NODE_VALUE_DISPATCHER_ID] ?? "").trim();
      if (cur !== removedDispatcherId) {
        return n;
      }
      const values = { ...(n.values ?? {}) };
      delete values[NODE_VALUE_DISPATCHER_ID];
      return {
        ...n,
        values: Object.keys(values).length > 0 ? values : undefined,
      };
    }),
  });
  return {
    ...doc,
    graph: stripGraph(doc.graph),
    functions: doc.functions.map(stripGraph),
    dispatchers: doc.dispatchers.map((d) => ({ ...d, graph: stripGraph(d.graph) })),
  };
};

/**
 * Rename a dispatcher's id and patch `graph.id`, plus all `dispatcherId` references on broadcast/bind/clear nodes.
 * Returns `null` if `newId` is empty or conflicts with another function/dispatcher id.
 */
export const renameDispatcherIdInDocument = (
  doc: BlueprintDocument,
  oldId: string,
  newId: string
): BlueprintDocument | null => {
  const trimmed = newId.trim();
  if (!trimmed || trimmed === oldId) {
    return doc;
  }
  if (!doc.dispatchers.some((d) => d.id === oldId)) {
    return null;
  }
  const fnIds = new Set(doc.functions.map((f) => f.id));
  if (fnIds.has(trimmed)) {
    return null;
  }
  if (doc.dispatchers.some((d) => d.id === trimmed && d.id !== oldId)) {
    return null;
  }

  const patchGraphRefs = (g: BlueprintGraphBody): BlueprintGraphBody => ({
    ...g,
    nodes: g.nodes.map((n) => {
      if (!n.template || !TEMPLATES_WITH_DISPATCHER_TARGET.has(n.template)) {
        return n;
      }
      const cur = (n.values?.[NODE_VALUE_DISPATCHER_ID] ?? "").trim();
      if (cur !== oldId) {
        return n;
      }
      return {
        ...n,
        values: {
          ...(n.values ?? {}),
          [NODE_VALUE_DISPATCHER_ID]: trimmed,
        },
      };
    }),
  });

  return {
    ...doc,
    graph: patchGraphRefs(doc.graph),
    functions: doc.functions.map((f) => patchGraphRefs(f)),
    dispatchers: doc.dispatchers.map((d) => {
      const nextGraph = patchGraphRefs(d.graph);
      if (d.id !== oldId) {
        return { ...d, graph: nextGraph };
      }
      return { ...d, id: trimmed, graph: { ...nextGraph, id: trimmed } };
    }),
  };
};

export const mapDocAtTarget = (
  doc: BlueprintDocument,
  target: EditTarget,
  fn: (g: BlueprintGraphBody) => BlueprintGraphBody
): BlueprintDocument => {
  if (target.kind === "main") {
    return { ...doc, graph: fn(doc.graph) };
  }
  if (target.kind === "function") {
    const idx = doc.functions.findIndex((x) => x.id === target.id);
    if (idx < 0) {
      return doc;
    }
    const next = doc.functions.slice();
    next[idx] = fn(next[idx]!);
    return { ...doc, functions: next };
  }
  const idx = doc.dispatchers.findIndex((x) => x.id === target.id);
  if (idx < 0) {
    return doc;
  }
  const next = doc.dispatchers.slice();
  const cur = next[idx]!;
  next[idx] = { ...cur, graph: fn(cur.graph) };
  return { ...doc, dispatchers: next };
};

export const normalizeGraphVariables = (raw: unknown): BlueprintVariable[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: BlueprintVariable[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const v = entry as Record<string, unknown>;
    if (typeof v.name !== "string" || typeof v.type !== "string") {
      continue;
    }
    const name = v.name.trim();
    const type = v.type.trim();
    if (name && type) {
      out.push({ name, type });
    }
  }
  return out;
};

type LegacyGraphShape = {
  id?: string;
  name?: string;
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
  variables?: unknown;
};

type LegacyDocumentShape = {
  formatVersion?: number;
  graph: LegacyGraphShape;
  functions?: unknown;
  dispatchers?: unknown;
  inherits?: string;
  metadata?: Record<string, unknown>;
};

/** v2 mistaken shape */
type V2GraphEntry = {
  id?: string;
  name?: string;
  kind?: string;
  nodes?: BlueprintNode[];
  edges?: BlueprintEdge[];
  variables?: unknown;
};

const normalizeMetadata = (raw: unknown): Record<string, unknown> =>
  raw && typeof raw === "object" && !Array.isArray(raw) ? { ...(raw as Record<string, unknown>) } : {};

const graphBodyFromV2Entry = (entry: V2GraphEntry): BlueprintGraphBody | null => {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  if (!Array.isArray(entry.nodes) || !Array.isArray(entry.edges)) {
    return null;
  }
  const id = typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : "main";
  const name = typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : id;
  const variables = normalizeGraphVariables(entry.variables);
  return {
    id,
    name,
    nodes: entry.nodes,
    edges: entry.edges,
    variables,
  };
};

/** Extra graphs from legacy v2 `graphs[]` after index 0, only `kind: "function"`. */
const functionGraphsFromV2Tail = (graphs: unknown): BlueprintGraphBody[] => {
  if (!Array.isArray(graphs) || graphs.length < 2) {
    return [];
  }
  const out: BlueprintGraphBody[] = [];
  for (let i = 1; i < graphs.length; i++) {
    const entry = graphs[i] as V2GraphEntry;
    if (!entry || typeof entry !== "object" || entry.kind !== "function") {
      continue;
    }
    const b = graphBodyFromV2Entry(entry);
    if (b) {
      out.push(b);
    }
  }
  return out;
};

export const normalizeFunctionGraphsArray = (raw: unknown): BlueprintGraphBody[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: BlueprintGraphBody[] = [];
  for (const item of raw) {
    const b = graphBodyFromV2Entry(item as V2GraphEntry);
    if (b) {
      out.push(b);
    }
  }
  return out;
};

export const normalizeDispatchersArray = (raw: unknown): BlueprintDispatcher[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: BlueprintDispatcher[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : "";
    if (!id) {
      continue;
    }
    const name = typeof o.name === "string" && o.name.trim() ? o.name.trim() : id;
    const graphRaw = o.graph;
    if (!graphRaw || typeof graphRaw !== "object") {
      continue;
    }
    const g = graphRaw as LegacyGraphShape;
    if (!Array.isArray(g.nodes) || !Array.isArray(g.edges)) {
      continue;
    }
    const gid = typeof g.id === "string" && g.id.trim() ? g.id.trim() : id;
    const gname = typeof g.name === "string" && g.name.trim() ? g.name.trim() : name;
    out.push({
      id,
      name,
      graph: {
        id: gid,
        name: gname,
        nodes: g.nodes,
        edges: g.edges,
        variables: normalizeGraphVariables(g.variables),
      },
    });
  }
  return out;
};

export const createDefaultBlueprintDocument = (): BlueprintDocument => ({
  formatVersion: 1,
  functions: [],
  dispatchers: [],
  graph: {
    id: "main",
    name: "Main",
    nodes: [
      {
        id: "start",
        title: "Start",
        template: "Event.Start",
        isRoot: true,
        x: 120,
        y: 120,
        inputs: [],
        outputs: [{ name: "exec", type: "exec" }],
      },
      {
        id: "print",
        title: "Print",
        template: "Debug.Print",
        x: 430,
        y: 120,
        inputs: [
          { name: "exec", type: "exec" },
          { name: "text", type: "string" },
        ],
        outputs: [{ name: "exec", type: "exec" }],
        values: { text: "Hello Blueprint" },
      },
    ],
    edges: [
      {
        id: "e-start-print",
        fromNodeId: "start",
        fromPin: "exec",
        toNodeId: "print",
        toPin: "exec",
      },
    ],
    variables: [],
  },
  metadata: {},
});

const migrateLegacyDocument = (parsed: LegacyDocumentShape): BlueprintDocument => {
  const g = parsed.graph;
  const id = typeof g.id === "string" && g.id.trim() ? g.id.trim() : "main";
  const name = typeof g.name === "string" && g.name.trim() ? g.name.trim() : id;
  const variables = normalizeGraphVariables(g.variables);
  const inherits = typeof parsed.inherits === "string" && parsed.inherits.trim() ? parsed.inherits.trim() : undefined;
  const fnList = normalizeFunctionGraphsArray(parsed.functions);
  const dispList = normalizeDispatchersArray(parsed.dispatchers);
  return {
    formatVersion: typeof parsed.formatVersion === "number" && parsed.formatVersion >= 1 ? parsed.formatVersion : 1,
    graph: {
      id,
      name,
      nodes: g.nodes,
      edges: g.edges,
      variables,
    },
    functions: fnList,
    dispatchers: dispList,
    inherits,
    metadata: normalizeMetadata(parsed.metadata),
  };
};

/** Normalize parsed JSON object to document, or null. */
export const normalizeBlueprintDocumentValue = (parsed: unknown): BlueprintDocument | null => {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const o = parsed as Record<string, unknown>;

  if (Array.isArray(o.graphs) && o.graphs.length > 0) {
    const first = graphBodyFromV2Entry(o.graphs[0] as V2GraphEntry);
    if (!first) {
      return null;
    }
    const rootVars = normalizeGraphVariables(o.variables);
    first.variables = rootVars.length > 0 ? rootVars : first.variables;
    const inherits = typeof o.inherits === "string" && o.inherits.trim() ? o.inherits.trim() : undefined;
    const explicitFns = normalizeFunctionGraphsArray(o.functions);
    const fromTail = functionGraphsFromV2Tail(o.graphs);
    const functions = [...explicitFns, ...fromTail];
    const dispatchers = normalizeDispatchersArray(o.dispatchers);
    return {
      formatVersion: 1,
      graph: first,
      functions,
      dispatchers,
      inherits,
      metadata: normalizeMetadata(o.metadata),
    };
  }

  if (o.graph && typeof o.graph === "object") {
    const g = o.graph as LegacyGraphShape;
    if (Array.isArray(g.nodes) && Array.isArray(g.edges)) {
      return migrateLegacyDocument(parsed as LegacyDocumentShape);
    }
  }

  return null;
};

export const parseBlueprintDocumentJson = (content: string): BlueprintDocument => {
  try {
    const parsed = JSON.parse(content) as unknown;
    return normalizeBlueprintDocumentValue(parsed) ?? createDefaultBlueprintDocument();
  } catch {
    return createDefaultBlueprintDocument();
  }
};
