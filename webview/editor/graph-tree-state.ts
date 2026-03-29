export type GraphTreeNode = {
  id: string;
  isRoot?: boolean;
};

export type GraphTreeEdge = {
  fromNodeId: string;
  toNodeId: string;
};

export type GraphTreeState = {
  rootId: string | null;
  legalNodes: Set<string>;
  illegalNodes: Set<string>;
  canSetAsRoot: Set<string>;
  numberById: Map<string, number>;
};

export const computeNodeTreeState = (
  nodes: GraphTreeNode[],
  edges: GraphTreeEdge[]
): GraphTreeState => {
  const allNodeIds = nodes.map((n) => n.id);
  const rootId = nodes.find((n) => n.isRoot)?.id ?? null;
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
    (nodeOrderIndex.get(a) ?? Number.MAX_SAFE_INTEGER) -
      (nodeOrderIndex.get(b) ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b);

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

  const incomingInComponent = new Map<string, number>();
  for (const id of allNodeIds) {
    incomingInComponent.set(id, 0);
  }
  for (const e of edges) {
    const fromComp = componentIndexByNode.get(e.fromNodeId);
    const toComp = componentIndexByNode.get(e.toNodeId);
    if (fromComp === undefined || toComp === undefined || fromComp !== toComp) {
      continue;
    }
    incomingInComponent.set(e.toNodeId, (incomingInComponent.get(e.toNodeId) ?? 0) + 1);
  }
  const canSetAsRoot = new Set<string>(
    allNodeIds.filter((id) => (incomingInComponent.get(id) ?? 0) === 0)
  );

  const legalNodes = new Set<string>();
  if (rootId) {
    const legalComponent = components.find((comp) => comp.includes(rootId));
    if (legalComponent) {
      for (const id of legalComponent) {
        legalNodes.add(id);
      }
    }
  }
  const illegalNodes = new Set<string>(
    allNodeIds.filter((id) => id !== rootId && !legalNodes.has(id))
  );

  const numberById = new Map<string, number>();
  let nextNumber = 1;
  if (rootId) {
    numberById.set(rootId, 0);
    const visitQueue = [rootId];
    const visited = new Set<string>([rootId]);
    while (visitQueue.length > 0) {
      const cur = visitQueue.shift()!;
      const outs = Array.from(directedOut.get(cur) ?? []).sort(sortIds);
      for (const next of outs) {
        if (!legalNodes.has(next) || visited.has(next)) {
          continue;
        }
        visited.add(next);
        numberById.set(next, nextNumber++);
        visitQueue.push(next);
      }
    }
    for (const id of Array.from(legalNodes).sort(sortIds)) {
      if (id !== rootId && !numberById.has(id)) {
        numberById.set(id, nextNumber++);
      }
    }
  }
  for (const comp of components) {
    const isLegalComp = !!rootId && comp.includes(rootId);
    if (isLegalComp) {
      continue;
    }
    for (const id of comp.sort(sortIds)) {
      if (!numberById.has(id)) {
        numberById.set(id, nextNumber++);
      }
    }
  }

  return {
    rootId,
    legalNodes,
    illegalNodes,
    canSetAsRoot,
    numberById,
  };
};
