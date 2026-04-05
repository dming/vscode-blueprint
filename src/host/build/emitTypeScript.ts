import type { BlueprintDocument, BlueprintEdge, BlueprintGraphBody, BlueprintNode } from "../../shared/blueprint/documentModel";
import {
  NODE_VALUE_DISPATCHER_ID,
  NODE_VALUE_FUNCTION_ID,
  NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID,
  NODE_VALUE_LIFECYCLE_HOOK,
  TEMPLATE_BIND_DISPATCHER_LISTENER,
  TEMPLATE_BROADCAST_DISPATCHER,
  TEMPLATE_CLEAR_DISPATCHER_LISTENERS,
  TEMPLATE_DISPATCHER_ENTRY,
  TEMPLATE_FUNCTION_ENTRY,
  TEMPLATE_FUNCTION_RETURN,
  TEMPLATE_INVOKE_FUNCTION,
} from "../../shared/blueprint/documentModel";
function sanitizeIdent(raw: string): string {
  const s = raw.replace(/[^a-zA-Z0-9_]/g, "_");
  if (!s) {
    return "_";
  }
  if (/^[0-9]/.test(s)) {
    return `_${s}`;
  }
  return s;
}

function nodeMapOf(g: BlueprintGraphBody): Map<string, BlueprintNode> {
  return new Map(g.nodes.map((n) => [n.id, n]));
}

function isExecEdge(edge: BlueprintEdge, nodes: Map<string, BlueprintNode>): boolean {
  const from = nodes.get(edge.fromNodeId);
  const to = nodes.get(edge.toNodeId);
  if (!from || !to) {
    return false;
  }
  const op = from.outputs?.find((p) => p.name === edge.fromPin);
  const ip = to.inputs?.find((p) => p.name === edge.toPin);
  return op?.type === "exec" && ip?.type === "exec";
}

function execIncomingCount(g: BlueprintGraphBody): Map<string, number> {
  const nodes = nodeMapOf(g);
  const incoming = new Map<string, number>();
  for (const n of g.nodes) {
    incoming.set(n.id, 0);
  }
  for (const e of g.edges) {
    if (!isExecEdge(e, nodes)) {
      continue;
    }
    incoming.set(e.toNodeId, (incoming.get(e.toNodeId) ?? 0) + 1);
  }
  return incoming;
}

/** Topological order over exec-only edges (Kahn); leftover nodes appended if cycles exist. */
function topoOrderExec(g: BlueprintGraphBody, preferredRoots: string[]): string[] {
  const nodes = nodeMapOf(g);
  const execEdges = g.edges.filter((e) => isExecEdge(e, nodes));
  const inc = new Map<string, number>();
  for (const n of g.nodes) {
    inc.set(n.id, 0);
  }
  for (const e of execEdges) {
    inc.set(e.toNodeId, (inc.get(e.toNodeId) ?? 0) + 1);
  }

  const q: string[] = [];
  const enqueueZeros = (prefer: string[]) => {
    const add: string[] = [];
    for (const id of prefer) {
      if (nodes.has(id) && (inc.get(id) ?? 0) === 0) {
        add.push(id);
      }
    }
    if (add.length === 0) {
      for (const n of g.nodes) {
        if ((inc.get(n.id) ?? 0) === 0) {
          add.push(n.id);
        }
      }
    }
    add.sort((a, b) => a.localeCompare(b));
    for (const id of add) {
      if (!q.includes(id)) {
        q.push(id);
      }
    }
  };

  enqueueZeros(preferredRoots);

  const result: string[] = [];
  const done = new Set<string>();

  while (q.length > 0) {
    const id = q.shift()!;
    if (done.has(id)) {
      continue;
    }
    if ((inc.get(id) ?? 0) > 0) {
      continue;
    }
    done.add(id);
    result.push(id);
    const outs = execEdges
      .filter((e) => e.fromNodeId === id)
      .sort((a, b) => a.id.localeCompare(b.id));
    for (const e of outs) {
      const next = e.toNodeId;
      inc.set(next, (inc.get(next) ?? 0) - 1);
      if ((inc.get(next) ?? 0) === 0 && !done.has(next)) {
        q.push(next);
        q.sort((a, b) => a.localeCompare(b));
      }
    }
  }

  for (const n of g.nodes) {
    if (!result.includes(n.id)) {
      result.push(n.id);
    }
  }
  return result;
}

function findPreferredRootsMain(g: BlueprintGraphBody, globalListenTemplate?: string): string[] {
  const roots = g.nodes.filter((n) => n.isRoot === true).map((n) => n.id);
  if (roots.length > 0) {
    return roots;
  }
  const ev = g.nodes.filter((n) => n.template === "Event.Start").map((n) => n.id);
  const gel = globalListenTemplate
    ? g.nodes.filter((n) => n.template === globalListenTemplate).map((n) => n.id)
    : [];
  const merged = [...new Set([...ev, ...gel])].sort((a, b) => a.localeCompare(b));
  if (merged.length > 0) {
    return merged;
  }
  const incoming = execIncomingCount(g);
  return g.nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0).map((n) => n.id);
}

function findPreferredRootsFunction(g: BlueprintGraphBody): string[] {
  const ent = g.nodes.filter((n) => n.template === TEMPLATE_FUNCTION_ENTRY).map((n) => n.id);
  if (ent.length > 0) {
    return ent;
  }
  const incoming = execIncomingCount(g);
  return g.nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0).map((n) => n.id);
}

function findPreferredRootsDispatcher(g: BlueprintGraphBody): string[] {
  const ent = g.nodes.filter((n) => n.template === TEMPLATE_DISPATCHER_ENTRY).map((n) => n.id);
  if (ent.length > 0) {
    return ent;
  }
  const incoming = execIncomingCount(g);
  return g.nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0).map((n) => n.id);
}

function escapeStringLiteral(s: string): string {
  return JSON.stringify(s);
}

type EmitRefs = {
  validFn: Set<string>;
  validDispatcher: Set<string>;
  globalEventEmitTemplate?: string;
  globalEventListenTemplate?: string;
};

function emitNodeLine(node: BlueprintNode, refs: EmitRefs): string {
  const t = node.template ?? "";
  const ind = "  ";

  if (t === "Event.Start" || t === TEMPLATE_FUNCTION_ENTRY || t === TEMPLATE_DISPATCHER_ENTRY) {
    const lh = (node.values?.[NODE_VALUE_LIFECYCLE_HOOK] ?? "").trim();
    const tag = lh ? ` — ${lh}` : "";
    return `${ind}// ▶ ${node.title}${tag} (${t || "entry"})`;
  }
  if (refs.globalEventListenTemplate && t === refs.globalEventListenTemplate) {
    const cid = (node.values?.[NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID] ?? "").trim();
    const tag = cid ? ` — ${cid}` : "";
    return `${ind}// ▶ ${node.title}${tag} (${t})`;
  }
  if (t === TEMPLATE_FUNCTION_RETURN) {
    return `${ind}return;`;
  }
  if (t === TEMPLATE_INVOKE_FUNCTION) {
    const fid = (node.values?.[NODE_VALUE_FUNCTION_ID] ?? "").trim();
    if (!fid) {
      return `${ind}// TODO: InvokeFunction — no target selected`;
    }
    if (!refs.validFn.has(fid)) {
      return `${ind}// TODO: InvokeFunction — unknown function ${escapeStringLiteral(fid)}`;
    }
    const name = sanitizeIdent(fid);
    return `${ind}await ${name}(ctx);`;
  }
  if (t === TEMPLATE_BROADCAST_DISPATCHER) {
    const did = (node.values?.[NODE_VALUE_DISPATCHER_ID] ?? "").trim();
    if (!did) {
      return `${ind}// TODO: BroadcastDispatcher — no target selected`;
    }
    if (!refs.validDispatcher.has(did)) {
      return `${ind}// TODO: BroadcastDispatcher — unknown dispatcher ${escapeStringLiteral(did)}`;
    }
    const name = sanitizeIdent(did);
    return `${ind}await ctx.dispatchers.${name}(ctx);\n${ind}for (const _h of ctx.dispatcherListeners.${name}) {\n${ind}  await _h(ctx);\n${ind}}`;
  }
  if (t === TEMPLATE_BIND_DISPATCHER_LISTENER) {
    const did = (node.values?.[NODE_VALUE_DISPATCHER_ID] ?? "").trim();
    const fid = (node.values?.[NODE_VALUE_FUNCTION_ID] ?? "").trim();
    if (!did) {
      return `${ind}// TODO: BindDispatcherListener — no dispatcher selected`;
    }
    if (!fid) {
      return `${ind}// TODO: BindDispatcherListener — no function selected`;
    }
    if (!refs.validDispatcher.has(did)) {
      return `${ind}// TODO: BindDispatcherListener — unknown dispatcher ${escapeStringLiteral(did)}`;
    }
    if (!refs.validFn.has(fid)) {
      return `${ind}// TODO: BindDispatcherListener — unknown function ${escapeStringLiteral(fid)}`;
    }
    const dname = sanitizeIdent(did);
    const fname = sanitizeIdent(fid);
    return `${ind}ctx.dispatcherListeners.${dname}.push((c) => ${fname}(c));`;
  }
  if (t === TEMPLATE_CLEAR_DISPATCHER_LISTENERS) {
    const did = (node.values?.[NODE_VALUE_DISPATCHER_ID] ?? "").trim();
    if (!did) {
      return `${ind}// TODO: ClearDispatcherListeners — no dispatcher selected`;
    }
    if (!refs.validDispatcher.has(did)) {
      return `${ind}// TODO: ClearDispatcherListeners — unknown dispatcher ${escapeStringLiteral(did)}`;
    }
    const name = sanitizeIdent(did);
    return `${ind}ctx.dispatcherListeners.${name}.length = 0;`;
  }
  if (refs.globalEventEmitTemplate && t === refs.globalEventEmitTemplate) {
    const cid = (node.values?.[NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID] ?? "").trim();
    if (!cid) {
      return `${ind}// TODO: GlobalEvent.Emit — no channel selected`;
    }
    return `${ind}await ctx.globalEvents.emit(${escapeStringLiteral(cid)}, {}); // add payload from data pins when supported`;
  }
  if (t === "Debug.Print") {
    const text = node.values?.text ?? "";
    return `${ind}console.log(${escapeStringLiteral(text)});`;
  }
  if (t === "Math.AddInt") {
    const a = node.values?.a ?? "0";
    const b = node.values?.b ?? "0";
    const slotKey = sanitizeIdent(node.id);
    return `${ind}ctx.slots[${escapeStringLiteral(node.id)}] = Number(${escapeStringLiteral(String(a))}) + Number(${escapeStringLiteral(String(b))}); // ${node.title}`;
  }
  if (t === "Print" || node.title === "Print") {
    const text = node.values?.text ?? "";
    return `${ind}console.log(${escapeStringLiteral(text)}); // Print`;
  }

  return `${ind}// TODO: ${node.title} template=${escapeStringLiteral(t || "(none)")} id=${escapeStringLiteral(node.id)}`;
}

type GraphEmitKind = "main" | "function" | "dispatcher";

function emitGraphFunction(
  exportName: string,
  graph: BlueprintGraphBody,
  refs: EmitRefs,
  kind: GraphEmitKind
): string {
  const roots =
    kind === "main"
      ? findPreferredRootsMain(graph)
      : kind === "function"
        ? findPreferredRootsFunction(graph)
        : findPreferredRootsDispatcher(graph);
  const order = topoOrderExec(graph, roots);
  const nodeById = nodeMapOf(graph);

  const lines: string[] = [];
  lines.push(`/**`);
  lines.push(
    ` * ${
      kind === "main"
        ? "Event / main"
        : kind === "function"
          ? `Function "${graph.name}"`
          : `Dispatcher "${graph.name}"`
    } graph (${graph.id})`
  );
  lines.push(` */`);
  lines.push(`export async function ${exportName}(ctx: BlueprintRuntimeContext): Promise<void> {`);

  if (order.length === 0) {
    lines.push(`  // (empty graph)`);
  } else {
    for (const id of order) {
      const n = nodeById.get(id);
      if (!n) {
        continue;
      }
      lines.push(emitNodeLine(n, refs));
    }
  }

  lines.push(`}`);
  lines.push(``);
  return lines.join("\n");
}

export type EmitTypeScriptOptions = {
  sourceRelPath: string;
  generatedAt: string;
  /** From blueprint.config.json `runtimeTemplates` (optional). */
  globalEventEmitTemplate?: string;
  globalEventListenTemplate?: string;
};

/**
 * Generate a TypeScript module with async `run_*` (main graph) and one export per function id (sanitized).
 * Exec flow follows exec pins in topological order; data-heavy nodes emit TODO or minimal slots.
 */
export function emitTypeScriptFromBlueprint(
  doc: BlueprintDocument,
  options: EmitTypeScriptOptions
): string {
  const validFn = new Set(doc.functions.map((f) => f.id));
  const validDispatcher = new Set(doc.dispatchers.map((d) => d.id));
  const header: string[] = [];
  header.push(`/**`);
  header.push(` * Auto-generated from blueprint (TypeScript)`);
  header.push(` * Source: ${options.sourceRelPath}`);
  header.push(` * Generated: ${options.generatedAt}`);
  header.push(` *`);
  header.push(` * Do not edit by hand — re-run the Blueprint build.`);
  header.push(` */`);
  header.push(``);
  header.push(`/* eslint-disable no-console */`);
  header.push(``);
  header.push(`/**`);
  header.push(` * Runtime multicast (UE-style event dispatchers):`);
  header.push(` * - \`dispatchers[id]\` runs the static listener subgraph (\`dispatch_*\` export).`);
  header.push(` * - \`BroadcastDispatcher\` awaits that, then every handler in \`dispatcherListeners[id]\`.`);
  header.push(` * - \`BindDispatcherListener\` pushes \`(ctx) => fn(ctx)\` onto \`dispatcherListeners[id]\`.`);
  header.push(` * - \`ClearDispatcherListeners\` sets \`dispatcherListeners[id].length = 0\` (static graph unchanged).`);
  header.push(` */`);
  header.push(`export interface BlueprintRuntimeContext {`);
  header.push(`  /** Blueprint-level variables (graph.variables). */`);
  header.push(`  variables: Record<string, unknown>;`);
  header.push(`  /** Scratch / node outputs by node id. */`);
  header.push(`  slots: Record<string, unknown>;`);
  header.push(
    `  /** Static dispatcher listener per sanitized id (see \`dispatch_*\` exports). */`
  );
  header.push(
    `  dispatchers: Record<string, (ctx: BlueprintRuntimeContext) => Promise<void>>;`
  );
  header.push(`  /** Dynamic listeners registered by BindDispatcherListener (same keys as dispatchers). */`);
  header.push(
    `  dispatcherListeners: Record<string, Array<(ctx: BlueprintRuntimeContext) => Promise<void>>>;`
  );
  header.push(
    `  /** Cross-blueprint channel bus; host implements (see global event nodes in blueprint.config.json). */`
  );
  header.push(
    `  globalEvents: { emit(channelId: string, payload: Record<string, unknown>): Promise<void> | void };`
  );
  header.push(`}`);
  header.push(``);

  const parts: string[] = [...header];

  const refs: EmitRefs = {
    validFn,
    validDispatcher,
    globalEventEmitTemplate: options.globalEventEmitTemplate?.trim() || undefined,
    globalEventListenTemplate: options.globalEventListenTemplate?.trim() || undefined,
  };

  const fnBodies = [...doc.functions].sort((a, b) => a.id.localeCompare(b.id));
  for (const f of fnBodies) {
    const name = sanitizeIdent(f.id);
    parts.push(emitGraphFunction(name, f, refs, "function"));
  }

  const dispBodies = [...doc.dispatchers].sort((a, b) => a.id.localeCompare(b.id));
  for (const d of dispBodies) {
    const name = sanitizeIdent(d.id);
    parts.push(emitGraphFunction(`dispatch_${name}`, d.graph, refs, "dispatcher"));
  }

  const mainName = `run_${sanitizeIdent(doc.graph.name || doc.graph.id || "Main")}`;
  parts.push(emitGraphFunction(mainName, doc.graph, refs, "main"));

  parts.push(emitCreateBlueprintContext(doc));
  parts.push(``);

  parts.push(`export default ${mainName};`);
  parts.push(``);

  return parts.join("\n");
}

function emitCreateBlueprintContext(doc: BlueprintDocument): string {
  const lines: string[] = [];
  const sorted = [...doc.dispatchers].sort((a, b) => a.id.localeCompare(b.id));
  lines.push(`export function createBlueprintContext(): BlueprintRuntimeContext {`);
  lines.push(`  return {`);
  lines.push(`    variables: {},`);
  lines.push(`    slots: {},`);
  if (sorted.length === 0) {
    lines.push(`    dispatchers: {},`);
    lines.push(`    dispatcherListeners: {},`);
  } else {
    lines.push(`    dispatchers: {`);
    for (const d of sorted) {
      const name = sanitizeIdent(d.id);
      lines.push(`      ${name}: (ctx) => dispatch_${name}(ctx),`);
    }
    lines.push(`    },`);
    lines.push(`    dispatcherListeners: {`);
    for (const d of sorted) {
      const name = sanitizeIdent(d.id);
      lines.push(`      ${name}: [],`);
    }
    lines.push(`    },`);
  }
  lines.push(`    globalEvents: {`);
  lines.push(`      async emit(_channelId: string, _payload: Record<string, unknown>): Promise<void> {`);
  lines.push(`        /* host replaces ctx.globalEvents */`);
  lines.push(`      },`);
  lines.push(`    },`);
  lines.push(`  };`);
  lines.push(`}`);
  return lines.join("\n");
}
