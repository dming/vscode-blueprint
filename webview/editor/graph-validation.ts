type PinLike = { name: string; type: string };
type NodeLike = { id: string; inputs: PinLike[]; outputs: PinLike[] };
type EdgeLike = {
  fromNodeId: string;
  fromPin: string;
  toNodeId: string;
  toPin: string;
};
type GraphSlice = {
  nodes: NodeLike[];
  edges: EdgeLike[];
};
type PendingConnectionLike = {
  fromNodeId: string;
  fromPin: string;
};

const findOutputPin = (node: NodeLike | undefined, pinName: string): PinLike | undefined =>
  node?.outputs.find((p) => p.name === pinName);

const findInputPin = (node: NodeLike | undefined, pinName: string): PinLike | undefined =>
  node?.inputs.find((p) => p.name === pinName);

export type ConnectionHintKey =
  | "connectionSourceOrTargetNodeMissing"
  | "connectionSourceOrTargetPinMissing"
  | "connectionPinTypeMismatch"
  | "connectionAlreadyExists"
  | "connectionExecInputAlreadyConnected";

export const validateConnectionHintKey = (
  graph: GraphSlice,
  pending: PendingConnectionLike,
  toNodeId: string,
  toPinName: string
): ConnectionHintKey | null => {
  const fromNode = graph.nodes.find((n) => n.id === pending.fromNodeId);
  const toNode = graph.nodes.find((n) => n.id === toNodeId);
  if (!fromNode || !toNode) {
    return "connectionSourceOrTargetNodeMissing";
  }
  const outPin = findOutputPin(fromNode, pending.fromPin);
  const inPin = findInputPin(toNode, toPinName);
  if (!outPin || !inPin) {
    return "connectionSourceOrTargetPinMissing";
  }
  if (outPin.type !== inPin.type) {
    return "connectionPinTypeMismatch";
  }
  if (
    graph.edges.some(
      (e) =>
        e.fromNodeId === pending.fromNodeId &&
        e.fromPin === pending.fromPin &&
        e.toNodeId === toNodeId &&
        e.toPin === toPinName
    )
  ) {
    return "connectionAlreadyExists";
  }
  // MVP rule: each exec input accepts one incoming edge.
  if (
    inPin.type === "exec" &&
    graph.edges.some((e) => e.toNodeId === toNodeId && e.toPin === toPinName)
  ) {
    return "connectionExecInputAlreadyConnected";
  }
  return null;
};

