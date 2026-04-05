import type { BlueprintDocument, BlueprintGraphBody } from "../../shared/blueprint/documentModel";
import {
  NODE_VALUE_DISPATCHER_ID,
  TEMPLATE_BROADCAST_DISPATCHER,
  TEMPLATE_DISPATCHER_ENTRY,
  TEMPLATE_FUNCTION_ENTRY,
  TEMPLATE_FUNCTION_RETURN,
  TEMPLATE_INVOKE_FUNCTION,
} from "../../shared/blueprint/documentModel";

export type InvokeSite = {
  nodeId: string;
  targetFunctionId: string;
  resolved: boolean;
};

export type BroadcastSite = {
  nodeId: string;
  targetDispatcherId: string;
  resolved: boolean;
};

export type CompiledFunctionInfo = {
  id: string;
  name: string;
  entryNodeIds: string[];
  returnNodeIds: string[];
  internalInvokes: InvokeSite[];
};

export type CompiledDispatcherInfo = {
  id: string;
  name: string;
  entryNodeIds: string[];
};

export type CompilationResult = {
  generatedAt: string;
  main: { invokeSites: InvokeSite[]; broadcastSites: BroadcastSite[] };
  functions: Record<string, CompiledFunctionInfo>;
  dispatchers: Record<string, CompiledDispatcherInfo>;
};

function collectInvokeSites(graph: BlueprintGraphBody, validFunctionIds: Set<string>): InvokeSite[] {
  const out: InvokeSite[] = [];
  for (const n of graph.nodes) {
    if (n.template !== TEMPLATE_INVOKE_FUNCTION) {
      continue;
    }
    const fid = (n.values?.functionId ?? "").trim();
    if (!fid) {
      continue;
    }
    out.push({
      nodeId: n.id,
      targetFunctionId: fid,
      resolved: validFunctionIds.has(fid),
    });
  }
  return out;
}

function collectBroadcastSites(graph: BlueprintGraphBody, validDispatcherIds: Set<string>): BroadcastSite[] {
  const out: BroadcastSite[] = [];
  for (const n of graph.nodes) {
    if (n.template !== TEMPLATE_BROADCAST_DISPATCHER) {
      continue;
    }
    const did = (n.values?.[NODE_VALUE_DISPATCHER_ID] ?? "").trim();
    if (!did) {
      continue;
    }
    out.push({
      nodeId: n.id,
      targetDispatcherId: did,
      resolved: validDispatcherIds.has(did),
    });
  }
  return out;
}

/** Structured summary for tooling / codegen; does not remove data from the blueprint. */
export function compileBlueprintDocument(doc: BlueprintDocument): CompilationResult {
  const validFunctionIds = new Set(doc.functions.map((f) => f.id));
  const validDispatcherIds = new Set(doc.dispatchers.map((d) => d.id));
  const functions: Record<string, CompiledFunctionInfo> = {};
  const dispatchers: Record<string, CompiledDispatcherInfo> = {};

  for (const f of doc.functions) {
    functions[f.id] = {
      id: f.id,
      name: f.name,
      entryNodeIds: f.nodes.filter((n) => n.template === TEMPLATE_FUNCTION_ENTRY).map((n) => n.id),
      returnNodeIds: f.nodes.filter((n) => n.template === TEMPLATE_FUNCTION_RETURN).map((n) => n.id),
      internalInvokes: collectInvokeSites(f, validFunctionIds),
    };
  }

  for (const d of doc.dispatchers) {
    dispatchers[d.id] = {
      id: d.id,
      name: d.name,
      entryNodeIds: d.graph.nodes.filter((n) => n.template === TEMPLATE_DISPATCHER_ENTRY).map((n) => n.id),
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    main: {
      invokeSites: collectInvokeSites(doc.graph, validFunctionIds),
      broadcastSites: collectBroadcastSites(doc.graph, validDispatcherIds),
    },
    functions,
    dispatchers,
  };
}
