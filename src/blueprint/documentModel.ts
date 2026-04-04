/**
 * Blueprint document: primary `graph` (event / main graph) plus optional `functions[]` (each is its own subgraph).
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
/** Main graph entry node; pin layout comes from blueprint.config.json `Event.Start`. */
export const TEMPLATE_EVENT_START = "Event.Start";

/**
 * When set on an `Event.Start` node's `values`, ties the node to a lifecycle hook name in the explorer.
 * Custom hooks are listed from the main graph by scanning nodes with this value.
 */
export const NODE_VALUE_LIFECYCLE_HOOK = "lifecycleHook";

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

export type BlueprintDocument = {
  formatVersion: number;
  graph: BlueprintGraphBody;
  /** User-defined function graphs (editable subgraphs). */
  functions: BlueprintGraphBody[];
  /** Base class name; must match a key in blueprint.config.json `baseClasses`. */
  inherits?: string;
  metadata: Record<string, unknown>;
};

/** What the canvas is currently editing: main graph or one function graph. */
export type EditTarget = { kind: "main" } | { kind: "function"; id: string };

export const getGraphBody = (doc: BlueprintDocument, target: EditTarget): BlueprintGraphBody => {
  if (target.kind === "main") {
    return doc.graph;
  }
  const f = doc.functions.find((x) => x.id === target.id);
  return f ?? doc.graph;
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

/** Clear `functionId` on invoke nodes that pointed at a removed function (all graphs). */
export const stripInvokeReferencesToFunction = (doc: BlueprintDocument, removedFunctionId: string): BlueprintDocument => {
  const stripGraph = (g: BlueprintGraphBody): BlueprintGraphBody => ({
    ...g,
    nodes: g.nodes.map((n) => {
      if (n.template !== TEMPLATE_INVOKE_FUNCTION) {
        return n;
      }
      const cur = (n.values?.functionId ?? "").trim();
      if (cur !== removedFunctionId) {
        return n;
      }
      const values = { ...(n.values ?? {}) };
      delete values.functionId;
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
  const idx = doc.functions.findIndex((x) => x.id === target.id);
  if (idx < 0) {
    return doc;
  }
  const next = doc.functions.slice();
  next[idx] = fn(next[idx]!);
  return { ...doc, functions: next };
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

export const createDefaultBlueprintDocument = (): BlueprintDocument => ({
  formatVersion: 1,
  functions: [],
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
    return {
      formatVersion: 1,
      graph: first,
      functions,
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
