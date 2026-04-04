import {
  type BlueprintEdge,
  type BlueprintNode,
  type BlueprintVariable,
  normalizeBlueprintDocumentValue,
  TEMPLATE_FUNCTION_ENTRY,
  TEMPLATE_FUNCTION_RETURN,
  TEMPLATE_INVOKE_FUNCTION,
} from "../blueprint/documentModel";

export type { BlueprintVariable } from "../blueprint/documentModel";

export type BlueprintDocument = Record<string, unknown>;

export type BuildIssue = {
  file: string;
  message: string;
  level: "error" | "warning";
  nodeId?: string;
  nodeIds?: string[];
  edgeId?: string;
};

function validateVariables(
  variables: BlueprintVariable[],
  relPath: string,
  issues: BuildIssue[],
  scopeLabel?: string
): void {
  const seen = new Set<string>();
  const scope = scopeLabel ? `${scopeLabel} ` : "";
  for (let vi = 0; vi < variables.length; vi++) {
    const v = variables[vi];
    if (!v || typeof v.name !== "string" || !v.name.trim() || typeof v.type !== "string" || !v.type.trim()) {
      issues.push({
        file: relPath,
        level: "error",
        message: `${scope}variables[${vi}] must have non-empty name and type strings.`,
      });
      continue;
    }
    if (seen.has(v.name)) {
      issues.push({
        file: relPath,
        level: "warning",
        message: `${scope}Duplicate blueprint variable name '${v.name}'.`,
      });
    }
    seen.add(v.name);
  }
}

function validateGraphInternals(
  nodes: BlueprintNode[],
  edges: BlueprintEdge[],
  relPath: string,
  issues: BuildIssue[],
  messagePrefix?: string
): void {
  const pre = messagePrefix ? `${messagePrefix} ` : "";
  const nodeMap = new Map<string, BlueprintNode>();
  for (const node of nodes) {
    if (!node || typeof node.id !== "string" || node.id.trim() === "") {
      issues.push({
        file: relPath,
        level: "error",
        message: `${pre}Node id must be a non-empty string.`,
      });
      continue;
    }
    if (nodeMap.has(node.id)) {
      issues.push({
        file: relPath,
        level: "error",
        nodeId: node.id,
        message: `${pre}Duplicate node id '${node.id}'.`,
      });
      continue;
    }
    nodeMap.set(node.id, node);

    const pinSeen = new Set<string>();
    for (const pin of node.inputs ?? []) {
      if (!pin?.name || !pin?.type) {
        issues.push({
          file: relPath,
          level: "error",
          nodeId: node.id,
          message: `${pre}Node '${node.id}' has invalid input pin.`,
        });
        continue;
      }
      const key = `in:${pin.name}`;
      if (pinSeen.has(key)) {
        issues.push({
          file: relPath,
          level: "error",
          nodeId: node.id,
          message: `${pre}Node '${node.id}' has duplicate input pin '${pin.name}'.`,
        });
      } else {
        pinSeen.add(key);
      }
    }
    for (const pin of node.outputs ?? []) {
      if (!pin?.name || !pin?.type) {
        issues.push({
          file: relPath,
          level: "error",
          nodeId: node.id,
          message: `${pre}Node '${node.id}' has invalid output pin.`,
        });
        continue;
      }
      const key = `out:${pin.name}`;
      if (pinSeen.has(key)) {
        issues.push({
          file: relPath,
          level: "error",
          nodeId: node.id,
          message: `${pre}Node '${node.id}' has duplicate output pin '${pin.name}'.`,
        });
      } else {
        pinSeen.add(key);
      }
    }
  }

  const execInputIncoming = new Set<string>();
  for (const edge of edges) {
    if (!edge || !edge.id) {
      issues.push({
        file: relPath,
        level: "error",
        message: `${pre}Edge id must be a non-empty string.`,
      });
      continue;
    }
    const fromNode = nodeMap.get(edge.fromNodeId);
    const toNode = nodeMap.get(edge.toNodeId);
    if (!fromNode || !toNode) {
      issues.push({
        file: relPath,
        level: "error",
        edgeId: edge.id,
        message: `${pre}Edge '${edge.id}' references missing node(s): '${edge.fromNodeId}' -> '${edge.toNodeId}'.`,
      });
      continue;
    }
    const outPin = (fromNode.outputs ?? []).find((p) => p.name === edge.fromPin);
    const inPin = (toNode.inputs ?? []).find((p) => p.name === edge.toPin);
    if (!outPin || !inPin) {
      issues.push({
        file: relPath,
        level: "error",
        edgeId: edge.id,
        message: `${pre}Edge '${edge.id}' references missing pin(s).`,
      });
      continue;
    }
    if (outPin.type !== inPin.type) {
      issues.push({
        file: relPath,
        level: "error",
        edgeId: edge.id,
        message: `${pre}Edge '${edge.id}' pin type mismatch: ${edge.fromNodeId}.${edge.fromPin}(${outPin.type}) -> ${edge.toNodeId}.${edge.toPin}(${inPin.type}).`,
      });
    }
    if (inPin.type === "exec") {
      const key = `${edge.toNodeId}:${edge.toPin}`;
      if (execInputIncoming.has(key)) {
        issues.push({
          file: relPath,
          level: "error",
          edgeId: edge.id,
          nodeId: edge.toNodeId,
          message: `${pre}Exec input '${edge.toNodeId}.${edge.toPin}' has multiple incoming edges.`,
        });
      } else {
        execInputIncoming.add(key);
      }
    }
  }
}

function validateInvokeNodes(
  nodes: BlueprintNode[],
  relPath: string,
  issues: BuildIssue[],
  messagePrefix: string | undefined,
  callableFunctionIds: Set<string>
): void {
  const pre = messagePrefix ? `${messagePrefix} ` : "";
  for (const n of nodes) {
    if (n.template !== TEMPLATE_INVOKE_FUNCTION) {
      continue;
    }
    const fid = (n.values?.functionId ?? "").trim();
    if (!fid) {
      issues.push({
        file: relPath,
        level: "warning",
        nodeId: n.id,
        message: `${pre}Invoke node '${n.id}' has no target function selected.`,
      });
      continue;
    }
    if (!callableFunctionIds.has(fid)) {
      issues.push({
        file: relPath,
        level: "error",
        nodeId: n.id,
        message: `${pre}Invoke node '${n.id}' references unknown function '${fid}'.`,
      });
    }
  }
}

function validateFunctionEntryReturn(
  nodes: BlueprintNode[],
  relPath: string,
  issues: BuildIssue[],
  messagePrefix: string
): void {
  const entries = nodes.filter((n) => n.template === TEMPLATE_FUNCTION_ENTRY);
  const returns = nodes.filter((n) => n.template === TEMPLATE_FUNCTION_RETURN);
  const pre = `${messagePrefix} `;
  if (entries.length === 0) {
    issues.push({
      file: relPath,
      level: "warning",
      message: `${pre}Function graph has no Function Entry node (Flow.FunctionEntry).`,
    });
  } else if (entries.length > 1) {
    issues.push({
      file: relPath,
      level: "warning",
      nodeIds: entries.map((e) => e.id),
      message: `${pre}Multiple Function Entry nodes (${entries.length}); only one entry is supported.`,
    });
  }
  if (returns.length === 0) {
    issues.push({
      file: relPath,
      level: "warning",
      message: `${pre}Function graph has no Return node (Flow.FunctionReturn).`,
    });
  } else if (returns.length > 1) {
    issues.push({
      file: relPath,
      level: "warning",
      nodeIds: returns.map((e) => e.id),
      message: `${pre}Multiple Return nodes (${returns.length}); ensure control flow is valid.`,
    });
  }
}

export function validateBlueprintDocument(doc: BlueprintDocument, relPath: string): BuildIssue[] {
  const issues: BuildIssue[] = [];
  const normalized = normalizeBlueprintDocumentValue(doc);
  if (!normalized) {
    issues.push({
      file: relPath,
      level: "error",
      message:
        "Invalid blueprint shape: expected `graph` with nodes/edges, or legacy v2 `graphs` (first graph only is kept).",
    });
    return issues;
  }

  validateVariables(normalized.graph.variables, relPath, issues);
  validateGraphInternals(normalized.graph.nodes, normalized.graph.edges, relPath, issues);

  const fnIds = new Set<string>();
  for (let fi = 0; fi < normalized.functions.length; fi++) {
    const f = normalized.functions[fi];
    const scope = `functions[${fi}] "${f.name}"`;
    if (!f.id?.trim()) {
      issues.push({
        file: relPath,
        level: "error",
        message: `functions[${fi}] must have a non-empty id.`,
      });
      continue;
    }
    if (fnIds.has(f.id)) {
      issues.push({
        file: relPath,
        level: "error",
        message: `Duplicate function id '${f.id}'.`,
      });
    }
    fnIds.add(f.id);
    validateVariables(f.variables, relPath, issues, `[${scope}]`);
    validateGraphInternals(f.nodes, f.edges, relPath, issues, `[${scope}]`);
  }

  const callableFunctionIds = new Set(normalized.functions.map((f) => f.id));
  validateInvokeNodes(normalized.graph.nodes, relPath, issues, undefined, callableFunctionIds);
  for (let fi = 0; fi < normalized.functions.length; fi++) {
    const f = normalized.functions[fi];
    const scope = `functions[${fi}] "${f.name}"`;
    validateInvokeNodes(f.nodes, relPath, issues, `[${scope}]`, callableFunctionIds);
    validateFunctionEntryReturn(f.nodes, relPath, issues, `[${scope}]`);
  }

  return issues;
}
