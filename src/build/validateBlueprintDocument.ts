export type BlueprintPin = { name: string; type: string };
export type BlueprintNode = {
  id: string;
  title?: string;
  isRoot?: boolean;
  inputs?: BlueprintPin[];
  outputs?: BlueprintPin[];
};
export type BlueprintEdge = {
  id: string;
  fromNodeId: string;
  fromPin: string;
  toNodeId: string;
  toPin: string;
};
export type BlueprintDocument = {
  formatVersion?: number;
  graph?: {
    nodes?: BlueprintNode[];
    edges?: BlueprintEdge[];
  };
};

export type BuildIssue = {
  file: string;
  message: string;
  level: "error" | "warning";
  nodeId?: string;
  nodeIds?: string[];
  edgeId?: string;
};

export function validateBlueprintDocument(doc: BlueprintDocument, relPath: string): BuildIssue[] {
  const issues: BuildIssue[] = [];
  if (!doc.graph || !Array.isArray(doc.graph.nodes) || !Array.isArray(doc.graph.edges)) {
    issues.push({
      file: relPath,
      level: "error",
      message: "Invalid blueprint shape: expected graph.nodes and graph.edges arrays.",
    });
    return issues;
  }

  const nodes = doc.graph.nodes;
  const edges = doc.graph.edges;
  const nodeMap = new Map<string, BlueprintNode>();
  const rootNodeIds: string[] = [];
  for (const node of nodes) {
    if (!node || typeof node.id !== "string" || node.id.trim() === "") {
      issues.push({
        file: relPath,
        level: "error",
        message: "Node id must be a non-empty string.",
      });
      continue;
    }
    if (nodeMap.has(node.id)) {
      issues.push({
        file: relPath,
        level: "error",
        nodeId: node.id,
        message: `Duplicate node id '${node.id}'.`,
      });
      continue;
    }
    nodeMap.set(node.id, node);
    if (node.isRoot === true) {
      rootNodeIds.push(node.id);
    }

    const pinSeen = new Set<string>();
    for (const pin of node.inputs ?? []) {
      if (!pin?.name || !pin?.type) {
        issues.push({
          file: relPath,
          level: "error",
          nodeId: node.id,
          message: `Node '${node.id}' has invalid input pin.`,
        });
        continue;
      }
      const key = `in:${pin.name}`;
      if (pinSeen.has(key)) {
        issues.push({
          file: relPath,
          level: "error",
          nodeId: node.id,
          message: `Node '${node.id}' has duplicate input pin '${pin.name}'.`,
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
          message: `Node '${node.id}' has invalid output pin.`,
        });
        continue;
      }
      const key = `out:${pin.name}`;
      if (pinSeen.has(key)) {
        issues.push({
          file: relPath,
          level: "error",
          nodeId: node.id,
          message: `Node '${node.id}' has duplicate output pin '${pin.name}'.`,
        });
      } else {
        pinSeen.add(key);
      }
    }
  }
  if (rootNodeIds.length > 1) {
    const firstRoot = rootNodeIds[0];
    issues.push({
      file: relPath,
      level: "warning",
      nodeId: firstRoot,
      nodeIds: rootNodeIds,
      message:
        `Multiple nodes are marked as root (${rootNodeIds.join(", ")}). ` +
        `Editor currently uses the first root '${firstRoot}'. ` +
        `多个节点被标记为 Root（${rootNodeIds.join("、")}），编辑器当前将使用第一个 Root '${firstRoot}'。`,
    });
  }

  const execInputIncoming = new Set<string>();
  for (const edge of edges) {
    if (!edge || !edge.id) {
      issues.push({
        file: relPath,
        level: "error",
        message: "Edge id must be a non-empty string.",
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
        message: `Edge '${edge.id}' references missing node(s): '${edge.fromNodeId}' -> '${edge.toNodeId}'.`,
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
        message: `Edge '${edge.id}' references missing pin(s).`,
      });
      continue;
    }
    if (outPin.type !== inPin.type) {
      issues.push({
        file: relPath,
        level: "error",
        edgeId: edge.id,
        message: `Edge '${edge.id}' pin type mismatch: ${edge.fromNodeId}.${edge.fromPin}(${outPin.type}) -> ${edge.toNodeId}.${edge.toPin}(${inPin.type}).`,
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
          message: `Exec input '${edge.toNodeId}.${edge.toPin}' has multiple incoming edges.`,
        });
      } else {
        execInputIncoming.add(key);
      }
    }
  }

  return issues;
}
