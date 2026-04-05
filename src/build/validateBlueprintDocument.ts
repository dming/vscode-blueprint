import {
  type BlueprintEdge,
  type BlueprintNode,
  type BlueprintVariable,
  NODE_VALUE_DISPATCHER_ID,
  NODE_VALUE_FUNCTION_ID,
  NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID,
  normalizeBlueprintDocumentValue,
  TEMPLATE_BIND_DISPATCHER_LISTENER,
  TEMPLATE_BROADCAST_DISPATCHER,
  TEMPLATE_CLEAR_DISPATCHER_LISTENERS,
  TEMPLATE_DISPATCHER_ENTRY,
  TEMPLATE_FUNCTION_ENTRY,
  TEMPLATE_FUNCTION_RETURN,
  TEMPLATE_INVOKE_FUNCTION,
} from "../blueprint/documentModel";
import type { GlobalEventChannelDef } from "../types";

export type { BlueprintVariable } from "../blueprint/documentModel";

export type BlueprintDocument = Record<string, unknown>;

/** Optional manifest + template names from blueprint.config.json (build / strict validation). */
export type ValidateBlueprintOptions = {
  globalEventChannels?: GlobalEventChannelDef[];
  globalEventEmitTemplate?: string;
  globalEventListenTemplate?: string;
};

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
    const fid = (n.values?.[NODE_VALUE_FUNCTION_ID] ?? "").trim();
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

function validateDispatcherEntry(
  nodes: BlueprintNode[],
  relPath: string,
  issues: BuildIssue[],
  messagePrefix: string
): void {
  const entries = nodes.filter((n) => n.template === TEMPLATE_DISPATCHER_ENTRY);
  const pre = `${messagePrefix} `;
  if (entries.length === 0) {
    issues.push({
      file: relPath,
      level: "warning",
      message: `${pre}Dispatcher graph has no Dispatcher Entry node (Flow.DispatcherEntry).`,
    });
  } else if (entries.length > 1) {
    issues.push({
      file: relPath,
      level: "warning",
      nodeIds: entries.map((e) => e.id),
      message: `${pre}Multiple Dispatcher Entry nodes (${entries.length}); only one entry is supported.`,
    });
  } else {
    const entry = entries[0]!;
    const seenPayload = new Set<string>();
    for (const pin of entry.outputs ?? []) {
      if (!pin?.name || pin.type === "exec") {
        continue;
      }
      if (seenPayload.has(pin.name)) {
        issues.push({
          file: relPath,
          level: "error",
          nodeId: entry.id,
          message: `${pre}Dispatcher Entry has duplicate payload output pin name '${pin.name}'.`,
        });
      }
      seenPayload.add(pin.name);
    }
  }
}

function validateBroadcastNodes(
  nodes: BlueprintNode[],
  relPath: string,
  issues: BuildIssue[],
  messagePrefix: string | undefined,
  callableDispatcherIds: Set<string>
): void {
  const pre = messagePrefix ? `${messagePrefix} ` : "";
  for (const n of nodes) {
    if (n.template !== TEMPLATE_BROADCAST_DISPATCHER) {
      continue;
    }
    const did = (n.values?.[NODE_VALUE_DISPATCHER_ID] ?? "").trim();
    if (!did) {
      issues.push({
        file: relPath,
        level: "warning",
        nodeId: n.id,
        message: `${pre}BroadcastDispatcher node '${n.id}' has no target dispatcher selected.`,
      });
      continue;
    }
    if (!callableDispatcherIds.has(did)) {
      issues.push({
        file: relPath,
        level: "error",
        nodeId: n.id,
        message: `${pre}BroadcastDispatcher node '${n.id}' references unknown dispatcher '${did}'.`,
      });
    }
  }
}

function validateNoBroadcastInDispatcherGraph(
  nodes: BlueprintNode[],
  relPath: string,
  issues: BuildIssue[],
  messagePrefix: string
): void {
  const pre = `${messagePrefix} `;
  for (const n of nodes) {
    if (n.template === TEMPLATE_BROADCAST_DISPATCHER) {
      issues.push({
        file: relPath,
        level: "error",
        nodeId: n.id,
        message: `${pre}BroadcastDispatcher is not allowed inside a dispatcher listener graph.`,
      });
    }
    if (n.template === TEMPLATE_BIND_DISPATCHER_LISTENER) {
      issues.push({
        file: relPath,
        level: "error",
        nodeId: n.id,
        message: `${pre}BindDispatcherListener is not allowed inside a dispatcher listener graph.`,
      });
    }
    if (n.template === TEMPLATE_CLEAR_DISPATCHER_LISTENERS) {
      issues.push({
        file: relPath,
        level: "error",
        nodeId: n.id,
        message: `${pre}ClearDispatcherListeners is not allowed inside a dispatcher listener graph.`,
      });
    }
  }
}

function validateBindDispatcherNodes(
  nodes: BlueprintNode[],
  relPath: string,
  issues: BuildIssue[],
  messagePrefix: string | undefined,
  callableFunctionIds: Set<string>,
  callableDispatcherIds: Set<string>
): void {
  const pre = messagePrefix ? `${messagePrefix} ` : "";
  for (const n of nodes) {
    if (n.template !== TEMPLATE_BIND_DISPATCHER_LISTENER) {
      continue;
    }
    const did = (n.values?.[NODE_VALUE_DISPATCHER_ID] ?? "").trim();
    const fid = (n.values?.[NODE_VALUE_FUNCTION_ID] ?? "").trim();
    if (!did) {
      issues.push({
        file: relPath,
        level: "warning",
        nodeId: n.id,
        message: `${pre}BindDispatcherListener node '${n.id}' has no target dispatcher selected.`,
      });
      continue;
    }
    if (!callableDispatcherIds.has(did)) {
      issues.push({
        file: relPath,
        level: "error",
        nodeId: n.id,
        message: `${pre}BindDispatcherListener node '${n.id}' references unknown dispatcher '${did}'.`,
      });
    }
    if (!fid) {
      issues.push({
        file: relPath,
        level: "warning",
        nodeId: n.id,
        message: `${pre}BindDispatcherListener node '${n.id}' has no target function selected.`,
      });
      continue;
    }
    if (!callableFunctionIds.has(fid)) {
      issues.push({
        file: relPath,
        level: "error",
        nodeId: n.id,
        message: `${pre}BindDispatcherListener node '${n.id}' references unknown function '${fid}'.`,
      });
    }
  }
}

function validateClearDispatcherNodes(
  nodes: BlueprintNode[],
  relPath: string,
  issues: BuildIssue[],
  messagePrefix: string | undefined,
  callableDispatcherIds: Set<string>
): void {
  const pre = messagePrefix ? `${messagePrefix} ` : "";
  for (const n of nodes) {
    if (n.template !== TEMPLATE_CLEAR_DISPATCHER_LISTENERS) {
      continue;
    }
    const did = (n.values?.[NODE_VALUE_DISPATCHER_ID] ?? "").trim();
    if (!did) {
      issues.push({
        file: relPath,
        level: "warning",
        nodeId: n.id,
        message: `${pre}ClearDispatcherListeners node '${n.id}' has no target dispatcher selected.`,
      });
      continue;
    }
    if (!callableDispatcherIds.has(did)) {
      issues.push({
        file: relPath,
        level: "error",
        nodeId: n.id,
        message: `${pre}ClearDispatcherListeners node '${n.id}' references unknown dispatcher '${did}'.`,
      });
    }
  }
}

type GlobalEventValidationOpts = {
  emitTemplate: string;
  listenTemplate: string;
  channels: GlobalEventChannelDef[];
};

function validateGlobalEventsInGraph(
  nodes: BlueprintNode[],
  relPath: string,
  issues: BuildIssue[],
  messagePrefix: string | undefined,
  graphKind: "main" | "function" | "dispatcher",
  opts: GlobalEventValidationOpts
): void {
  const pre = messagePrefix ? `${messagePrefix} ` : "";
  const channelIds = new Set(opts.channels.map((c) => c.id));
  for (const n of nodes) {
    const isEmit = n.template === opts.emitTemplate;
    const isListen = n.template === opts.listenTemplate;
    if (!isEmit && !isListen) {
      continue;
    }
    if (graphKind === "dispatcher") {
      issues.push({
        file: relPath,
        level: "error",
        nodeId: n.id,
        message: `${pre}Global event nodes are not allowed inside a dispatcher listener graph.`,
      });
      continue;
    }
    if (graphKind === "function" && isListen) {
      issues.push({
        file: relPath,
        level: "error",
        nodeId: n.id,
        message: `${pre}Global event Listen entry is only allowed on the main event graph.`,
      });
      continue;
    }
    const cid = (n.values?.[NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID] ?? "").trim();
    if (!cid) {
      issues.push({
        file: relPath,
        level: "warning",
        nodeId: n.id,
        message: `${pre}Global event node '${n.id}' has no channel id selected.`,
      });
      continue;
    }
    if (channelIds.size > 0 && !channelIds.has(cid)) {
      issues.push({
        file: relPath,
        level: "error",
        nodeId: n.id,
        message: `${pre}Global event node '${n.id}' references unknown channel '${cid}' (not listed in globalEventChannels).`,
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

  if (entries.length === 1) {
    const entry = entries[0]!;
    const seenOut = new Set<string>();
    for (const pin of entry.outputs ?? []) {
      if (!pin?.name || pin.type === "exec") {
        continue;
      }
      if (seenOut.has(pin.name)) {
        issues.push({
          file: relPath,
          level: "error",
          nodeId: entry.id,
          message: `${pre}Function Entry has duplicate payload output pin name '${pin.name}'.`,
        });
      }
      seenOut.add(pin.name);
    }
  }
  if (returns.length === 1) {
    const ret = returns[0]!;
    const seenIn = new Set<string>();
    for (const pin of ret.inputs ?? []) {
      if (!pin?.name || pin.type === "exec") {
        continue;
      }
      if (seenIn.has(pin.name)) {
        issues.push({
          file: relPath,
          level: "error",
          nodeId: ret.id,
          message: `${pre}Function Return has duplicate payload input pin name '${pin.name}'.`,
        });
      }
      seenIn.add(pin.name);
    }
  }
}

export function validateBlueprintDocument(
  doc: BlueprintDocument,
  relPath: string,
  options?: ValidateBlueprintOptions
): BuildIssue[] {
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

  const globalEventOpts: GlobalEventValidationOpts | null =
    options?.globalEventEmitTemplate?.trim() && options?.globalEventListenTemplate?.trim()
      ? {
          emitTemplate: options.globalEventEmitTemplate.trim(),
          listenTemplate: options.globalEventListenTemplate.trim(),
          channels: options.globalEventChannels ?? [],
        }
      : null;

  validateVariables(normalized.graph.variables, relPath, issues);
  validateGraphInternals(normalized.graph.nodes, normalized.graph.edges, relPath, issues);
  if (globalEventOpts) {
    validateGlobalEventsInGraph(
      normalized.graph.nodes,
      relPath,
      issues,
      undefined,
      "main",
      globalEventOpts
    );
  }

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
    if (globalEventOpts) {
      validateGlobalEventsInGraph(f.nodes, relPath, issues, `[${scope}]`, "function", globalEventOpts);
    }
  }

  const dispIds = new Set<string>();
  for (let di = 0; di < normalized.dispatchers.length; di++) {
    const d = normalized.dispatchers[di];
    const scope = `dispatchers[${di}] "${d.name}"`;
    if (!d.id?.trim()) {
      issues.push({
        file: relPath,
        level: "error",
        message: `dispatchers[${di}] must have a non-empty id.`,
      });
      continue;
    }
    if (fnIds.has(d.id) || dispIds.has(d.id)) {
      issues.push({
        file: relPath,
        level: "error",
        message: `Dispatcher id '${d.id}' conflicts with an existing function or dispatcher id.`,
      });
    }
    dispIds.add(d.id);
    validateVariables(d.graph.variables, relPath, issues, `[${scope}]`);
    validateGraphInternals(d.graph.nodes, d.graph.edges, relPath, issues, `[${scope}]`);
    if (globalEventOpts) {
      validateGlobalEventsInGraph(d.graph.nodes, relPath, issues, `[${scope}]`, "dispatcher", globalEventOpts);
    }
    validateNoBroadcastInDispatcherGraph(d.graph.nodes, relPath, issues, `[${scope}]`);
    validateDispatcherEntry(d.graph.nodes, relPath, issues, `[${scope}]`);
  }

  const callableFunctionIds = new Set(normalized.functions.map((f) => f.id));
  const callableDispatcherIds = new Set(normalized.dispatchers.map((d) => d.id));
  validateInvokeNodes(normalized.graph.nodes, relPath, issues, undefined, callableFunctionIds);
  validateBroadcastNodes(normalized.graph.nodes, relPath, issues, undefined, callableDispatcherIds);
  validateBindDispatcherNodes(
    normalized.graph.nodes,
    relPath,
    issues,
    undefined,
    callableFunctionIds,
    callableDispatcherIds
  );
  validateClearDispatcherNodes(normalized.graph.nodes, relPath, issues, undefined, callableDispatcherIds);
  for (let fi = 0; fi < normalized.functions.length; fi++) {
    const f = normalized.functions[fi];
    const scope = `functions[${fi}] "${f.name}"`;
    validateInvokeNodes(f.nodes, relPath, issues, `[${scope}]`, callableFunctionIds);
    validateBroadcastNodes(f.nodes, relPath, issues, `[${scope}]`, callableDispatcherIds);
    validateBindDispatcherNodes(f.nodes, relPath, issues, `[${scope}]`, callableFunctionIds, callableDispatcherIds);
    validateClearDispatcherNodes(f.nodes, relPath, issues, `[${scope}]`, callableDispatcherIds);
    validateFunctionEntryReturn(f.nodes, relPath, issues, `[${scope}]`);
  }
  for (let di = 0; di < normalized.dispatchers.length; di++) {
    const d = normalized.dispatchers[di];
    const scope = `dispatchers[${di}] "${d.name}"`;
    validateInvokeNodes(d.graph.nodes, relPath, issues, `[${scope}]`, callableFunctionIds);
  }

  return issues;
}
