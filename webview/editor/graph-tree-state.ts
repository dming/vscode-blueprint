import {
  NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID,
  NODE_VALUE_LIFECYCLE_HOOK,
  TEMPLATE_DISPATCHER_ENTRY,
  TEMPLATE_EVENT_START,
  TEMPLATE_FUNCTION_ENTRY,
} from "../../src/blueprint/documentModel";

/** Minimal node shape for tree / legality (matches blueprint graph nodes). */
export type GraphTreeNodeInput = {
  id: string;
  template?: string;
  values?: Record<string, string>;
  inputs: { name: string; type: string }[];
  outputs: { name: string; type: string }[];
};

export type GraphTreeEdge = {
  fromNodeId: string;
  toNodeId: string;
  fromPin: string;
  toPin: string;
};

export type GraphTreeMode = "main" | "function" | "dispatcher";

export type GraphTreeState = {
  /**
   * Main graph: Event.Start nodes whose `lifecycleHook` is declared on the inherited base class.
   * Used for the blue header style (same as the former manual “root” node).
   */
  configuredLifecycleNodeIds: Set<string>;
  /** Main graph: global event Listen nodes with a valid channel id (blue header). */
  globalEventListenNodeIds: Set<string>;
  legalNodes: Set<string>;
  illegalNodes: Set<string>;
  numberById: Map<string, number>;
};

const hasExecIncoming = (nodeId: string, nodeMap: Map<string, GraphTreeNodeInput>, edges: GraphTreeEdge[]): boolean => {
  for (const e of edges) {
    if (e.toNodeId !== nodeId) {
      continue;
    }
    const node = nodeMap.get(nodeId);
    const pin = node?.inputs.find((p) => p.name === e.toPin);
    if (pin?.type === "exec") {
      return true;
    }
  }
  return false;
};

const isMainValidTreeStart = (n: GraphTreeNodeInput, allowedLifecycleHooks: readonly string[]): boolean => {
  if (n.template !== TEMPLATE_EVENT_START) {
    return false;
  }
  const hook = (n.values?.[NODE_VALUE_LIFECYCLE_HOOK] ?? "").trim();
  if (allowedLifecycleHooks.length === 0) {
    return true;
  }
  return hook.length > 0 && allowedLifecycleHooks.includes(hook);
};

const isConfiguredLifecycleVisual = (n: GraphTreeNodeInput, allowedLifecycleHooks: readonly string[]): boolean => {
  if (allowedLifecycleHooks.length === 0 || n.template !== TEMPLATE_EVENT_START) {
    return false;
  }
  const hook = (n.values?.[NODE_VALUE_LIFECYCLE_HOOK] ?? "").trim();
  return hook.length > 0 && allowedLifecycleHooks.includes(hook);
};

const isFunctionValidTreeStart = (n: GraphTreeNodeInput): boolean => n.template === TEMPLATE_FUNCTION_ENTRY;

const isDispatcherValidTreeStart = (n: GraphTreeNodeInput): boolean => n.template === TEMPLATE_DISPATCHER_ENTRY;

export type GraphTreeGlobalEventOptions = {
  listenTemplate: string;
  /** When empty, any non-empty channel id on the node is accepted. */
  allowedChannelIds: readonly string[];
};

const isGlobalListenValidStart = (
  n: GraphTreeNodeInput,
  listenTemplate: string,
  allowedChannelIds: readonly string[]
): boolean => {
  if (!listenTemplate || n.template !== listenTemplate) {
    return false;
  }
  const cid = (n.values?.[NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID] ?? "").trim();
  if (!cid) {
    return false;
  }
  if (allowedChannelIds.length === 0) {
    return true;
  }
  return allowedChannelIds.includes(cid);
};

const isValidTreeStart = (
  n: GraphTreeNodeInput,
  mode: GraphTreeMode,
  allowedLifecycleHooks: readonly string[],
  globalEvent: GraphTreeGlobalEventOptions | null | undefined
): boolean => {
  if (mode === "function") {
    return isFunctionValidTreeStart(n);
  }
  if (mode === "dispatcher") {
    return isDispatcherValidTreeStart(n);
  }
  if (
    globalEvent?.listenTemplate &&
    isGlobalListenValidStart(n, globalEvent.listenTemplate, globalEvent.allowedChannelIds)
  ) {
    return true;
  }
  return isMainValidTreeStart(n, allowedLifecycleHooks);
};

/**
 * For each undirected connected component, take exec-entry nodes (no incoming exec edge), sort by
 * document order; the first entry must be a valid starter (main: configured lifecycle Event.Start;
 * function: Function Entry). That component is then legal; others are illegal.
 */
export const computeNodeTreeState = (
  nodes: GraphTreeNodeInput[],
  edges: GraphTreeEdge[],
  mode: GraphTreeMode,
  allowedLifecycleHooks: readonly string[],
  globalEvent?: GraphTreeGlobalEventOptions | null
): GraphTreeState => {
  const allNodeIds = nodes.map((n) => n.id);
  const nodeMap = new Map(nodes.map((n) => [n.id, n] as const));
  const nodeOrderIndex = new Map<string, number>();
  nodes.forEach((n, idx) => nodeOrderIndex.set(n.id, idx));

  const undirected = new Map<string, Set<string>>();
  const directedOut = new Map<string, Set<string>>();
  for (const id of allNodeIds) {
    undirected.set(id, new Set<string>());
    directedOut.set(id, new Set<string>());
  }
  for (const e of edges) {
    if (!undirected.has(e.fromNodeId) || !undirected.has(e.toNodeId)) {
      continue;
    }
    undirected.get(e.fromNodeId)!.add(e.toNodeId);
    undirected.get(e.toNodeId)!.add(e.fromNodeId);
    directedOut.get(e.fromNodeId)!.add(e.toNodeId);
  }
  const sortIds = (a: string, b: string) =>
    (nodeOrderIndex.get(a) ?? Number.MAX_SAFE_INTEGER) - (nodeOrderIndex.get(b) ?? Number.MAX_SAFE_INTEGER) ||
    a.localeCompare(b);

  const components: string[][] = [];
  const componentIndexByNode = new Map<string, number>();
  const seen = new Set<string>();
  for (const id of allNodeIds) {
    if (seen.has(id)) {
      continue;
    }
    const queue = [id];
    seen.add(id);
    const component: string[] = [];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      component.push(cur);
      const neighbors = Array.from(undirected.get(cur) ?? []).sort(sortIds);
      for (const next of neighbors) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    component.sort(sortIds);
    const compIndex = components.length;
    for (const nodeId of component) {
      componentIndexByNode.set(nodeId, compIndex);
    }
    components.push(component);
  }

  const legalNodes = new Set<string>();
  for (const comp of components) {
    const entryNodes = comp
      .filter((id) => !hasExecIncoming(id, nodeMap, edges))
      .sort(sortIds);
    const firstEntry = entryNodes[0];
    const legal =
      firstEntry !== undefined &&
      isValidTreeStart(nodeMap.get(firstEntry)!, mode, allowedLifecycleHooks, globalEvent);
    if (legal) {
      for (const id of comp) {
        legalNodes.add(id);
      }
    }
  }

  const illegalNodes = new Set<string>(allNodeIds.filter((id) => !legalNodes.has(id)));

  const configuredLifecycleNodeIds = new Set<string>();
  const globalEventListenNodeIds = new Set<string>();
  if (mode === "main") {
    for (const n of nodes) {
      if (isConfiguredLifecycleVisual(n, allowedLifecycleHooks)) {
        configuredLifecycleNodeIds.add(n.id);
      }
      if (
        globalEvent?.listenTemplate &&
        isGlobalListenValidStart(n, globalEvent.listenTemplate, globalEvent.allowedChannelIds)
      ) {
        globalEventListenNodeIds.add(n.id);
      }
    }
  }

  const numberById = new Map<string, number>();
  let nextNumber = 0;
  for (const comp of components) {
    const entryNodes = comp
      .filter((id) => !hasExecIncoming(id, nodeMap, edges))
      .sort(sortIds);
    const firstEntry = entryNodes[0];
    const compLegal =
      firstEntry !== undefined &&
      isValidTreeStart(nodeMap.get(firstEntry)!, mode, allowedLifecycleHooks, globalEvent);
    if (compLegal && firstEntry !== undefined) {
      numberById.set(firstEntry, nextNumber++);
      const visitQueue = [firstEntry];
      const visited = new Set<string>([firstEntry]);
      while (visitQueue.length > 0) {
        const cur = visitQueue.shift()!;
        const outs = Array.from(directedOut.get(cur) ?? []).sort(sortIds);
        for (const next of outs) {
          if (!comp.includes(next) || visited.has(next)) {
            continue;
          }
          visited.add(next);
          numberById.set(next, nextNumber++);
          visitQueue.push(next);
        }
      }
      for (const id of comp.sort(sortIds)) {
        if (!numberById.has(id)) {
          numberById.set(id, nextNumber++);
        }
      }
    } else {
      for (const id of comp.sort(sortIds)) {
        numberById.set(id, nextNumber++);
      }
    }
  }

  return {
    configuredLifecycleNodeIds,
    globalEventListenNodeIds,
    legalNodes,
    illegalNodes,
    numberById,
  };
};
