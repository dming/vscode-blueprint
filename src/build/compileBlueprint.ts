import type { BlueprintDocument, BlueprintGraphBody } from "../blueprint/documentModel";
import {
  TEMPLATE_FUNCTION_ENTRY,
  TEMPLATE_FUNCTION_RETURN,
  TEMPLATE_INVOKE_FUNCTION,
} from "../blueprint/documentModel";

export type InvokeSite = {
  nodeId: string;
  targetFunctionId: string;
  resolved: boolean;
};

export type CompiledFunctionInfo = {
  id: string;
  name: string;
  entryNodeIds: string[];
  returnNodeIds: string[];
  internalInvokes: InvokeSite[];
};

export type CompilationResult = {
  generatedAt: string;
  main: { invokeSites: InvokeSite[] };
  functions: Record<string, CompiledFunctionInfo>;
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

/** Structured summary for tooling / codegen; does not remove data from the blueprint. */
export function compileBlueprintDocument(doc: BlueprintDocument): CompilationResult {
  const validFunctionIds = new Set(doc.functions.map((f) => f.id));
  const functions: Record<string, CompiledFunctionInfo> = {};

  for (const f of doc.functions) {
    functions[f.id] = {
      id: f.id,
      name: f.name,
      entryNodeIds: f.nodes.filter((n) => n.template === TEMPLATE_FUNCTION_ENTRY).map((n) => n.id),
      returnNodeIds: f.nodes.filter((n) => n.template === TEMPLATE_FUNCTION_RETURN).map((n) => n.id),
      internalInvokes: collectInvokeSites(f, validFunctionIds),
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    main: { invokeSites: collectInvokeSites(doc.graph, validFunctionIds) },
    functions,
  };
}
