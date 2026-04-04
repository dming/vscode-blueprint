import type { BlueprintDocument, BlueprintEdge, BlueprintGraphBody, BlueprintNode } from "../blueprint/documentModel";
import {
  NODE_VALUE_LIFECYCLE_HOOK,
  TEMPLATE_FUNCTION_ENTRY,
  TEMPLATE_FUNCTION_RETURN,
  TEMPLATE_INVOKE_FUNCTION,
} from "../blueprint/documentModel";
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

function findPreferredRootsMain(g: BlueprintGraphBody): string[] {
  const roots = g.nodes.filter((n) => n.isRoot === true).map((n) => n.id);
  if (roots.length > 0) {
    return roots;
  }
  const ev = g.nodes.filter((n) => n.template === "Event.Start").map((n) => n.id);
  if (ev.length > 0) {
    return ev;
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

function escapeStringLiteral(s: string): string {
  return JSON.stringify(s);
}

function emitNodeLine(node: BlueprintNode, validFn: Set<string>): string {
  const t = node.template ?? "";
  const ind = "  ";

  if (t === "Event.Start" || t === TEMPLATE_FUNCTION_ENTRY) {
    const lh = (node.values?.[NODE_VALUE_LIFECYCLE_HOOK] ?? "").trim();
    const tag = lh ? ` — ${lh}` : "";
    return `${ind}// ▶ ${node.title}${tag} (${t || "entry"})`;
  }
  if (t === TEMPLATE_FUNCTION_RETURN) {
    return `${ind}return;`;
  }
  if (t === TEMPLATE_INVOKE_FUNCTION) {
    const fid = (node.values?.functionId ?? "").trim();
    if (!fid) {
      return `${ind}// TODO: InvokeFunction — no target selected`;
    }
    if (!validFn.has(fid)) {
      return `${ind}// TODO: InvokeFunction — unknown function ${escapeStringLiteral(fid)}`;
    }
    const name = sanitizeIdent(fid);
    return `${ind}await ${name}(ctx);`;
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

function emitGraphFunction(
  exportName: string,
  graph: BlueprintGraphBody,
  validFn: Set<string>,
  isMain: boolean
): string {
  const roots = isMain ? findPreferredRootsMain(graph) : findPreferredRootsFunction(graph);
  const order = topoOrderExec(graph, roots);
  const nodeById = nodeMapOf(graph);

  const lines: string[] = [];
  lines.push(`/**`);
  lines.push(` * ${isMain ? "Event / main" : `Function "${graph.name}"`} graph (${graph.id})`);
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
      lines.push(emitNodeLine(n, validFn));
    }
  }

  lines.push(`}`);
  lines.push(``);
  return lines.join("\n");
}

export type EmitTypeScriptOptions = {
  sourceRelPath: string;
  generatedAt: string;
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
  header.push(`export interface BlueprintRuntimeContext {`);
  header.push(`  /** Blueprint-level variables (graph.variables). */`);
  header.push(`  variables: Record<string, unknown>;`);
  header.push(`  /** Scratch / node outputs by node id. */`);
  header.push(`  slots: Record<string, unknown>;`);
  header.push(`}`);
  header.push(``);
  header.push(`export function createBlueprintContext(): BlueprintRuntimeContext {`);
  header.push(`  return { variables: {}, slots: {} };`);
  header.push(`}`);
  header.push(``);

  const parts: string[] = [...header];

  const fnBodies = [...doc.functions].sort((a, b) => a.id.localeCompare(b.id));
  for (const f of fnBodies) {
    const name = sanitizeIdent(f.id);
    parts.push(emitGraphFunction(name, f, validFn, false));
  }

  const mainName = `run_${sanitizeIdent(doc.graph.name || doc.graph.id || "Main")}`;
  parts.push(emitGraphFunction(mainName, doc.graph, validFn, true));

  parts.push(`export default ${mainName};`);
  parts.push(``);

  return parts.join("\n");
}
