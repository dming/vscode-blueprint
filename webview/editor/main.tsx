import { App, Button, Card, Divider, Form, Input, InputNumber, Select, Space, Switch, Tag, Typography } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import * as vscodeApi from "./vscodeApi";
import "./style.scss";

type Pin = { name: string; type: string };
type BlueprintNode = {
  id: string;
  title: string;
  description?: string;
  isRoot?: boolean;
  x: number;
  y: number;
  inputs: Pin[];
  outputs: Pin[];
  values?: Record<string, string>;
};
type BlueprintEdge = {
  id: string;
  fromNodeId: string;
  fromPin: string;
  toNodeId: string;
  toPin: string;
};
type BlueprintDocument = {
  formatVersion: number;
  graph: {
    id: string;
    name: string;
    nodes: BlueprintNode[];
    edges: BlueprintEdge[];
    variables: Array<{ name: string; type: string }>;
  };
  metadata: Record<string, unknown>;
};
type BuildIssue = {
  file: string;
  message: string;
  level: "error" | "warning";
  nodeId?: string;
  edgeId?: string;
};
type NodeDefPin = { name: string; type: string };
type NodeDef = {
  name: string;
  title?: string;
  category?: string;
  desc?: string;
  inputs?: NodeDefPin[];
  outputs?: NodeDefPin[];
  defaults?: Record<string, string | number | boolean>;
};

const createDefaultDocument = (): BlueprintDocument => ({
  formatVersion: 1,
  graph: {
    id: "main",
    name: "Main",
    nodes: [
      {
        id: "start",
        title: "Start",
        isRoot: true,
        x: 120,
        y: 120,
        inputs: [],
        outputs: [{ name: "exec", type: "exec" }],
      },
      {
        id: "print",
        title: "Print",
        x: 430,
        y: 120,
        inputs: [
          { name: "exec", type: "exec" },
          { name: "text", type: "string" },
        ],
        outputs: [{ name: "exec", type: "exec" }],
        values: { text: "Hello Blueprint" },
      },
    ],
    edges: [
      {
        id: "e-start-print",
        fromNodeId: "start",
        fromPin: "exec",
        toNodeId: "print",
        toPin: "exec",
      },
    ],
    variables: [],
  },
  metadata: {},
});

const parseDocument = (content: string): BlueprintDocument => {
  try {
    const parsed = JSON.parse(content) as BlueprintDocument;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.graph ||
      !Array.isArray(parsed.graph.nodes) ||
      !Array.isArray(parsed.graph.edges)
    ) {
      return createDefaultDocument();
    }
    return parsed;
  } catch {
    return createDefaultDocument();
  }
};
const cloneDocument = (doc: BlueprintDocument): BlueprintDocument =>
  JSON.parse(JSON.stringify(doc)) as BlueprintDocument;

const normalizeNodeDef = (raw: unknown): NodeDef | null => {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.name !== "string" || !obj.name.trim()) return null;
  const parsePins = (pins: unknown): NodeDefPin[] | undefined => {
    if (!Array.isArray(pins)) return undefined;
    const list: NodeDefPin[] = [];
    for (const p of pins) {
      if (typeof p === "string" && p.trim()) {
        const s = p.trim();
        if (s.includes(":")) {
          const [n, t] = s.split(":");
          const name = (n ?? "").trim();
          const type = (t ?? "").trim();
          if (name && type) list.push({ name, type });
        } else {
          list.push({ name: s, type: s === "exec" ? "exec" : "string" });
        }
      } else if (p && typeof p === "object") {
        const pin = p as Record<string, unknown>;
        if (typeof pin.name === "string" && typeof pin.type === "string") {
          list.push({ name: pin.name.trim(), type: pin.type.trim() });
        }
      }
    }
    return list;
  };
  return {
    name: obj.name.trim(),
    title: typeof obj.title === "string" ? obj.title : undefined,
    category: typeof obj.category === "string" ? obj.category : undefined,
    desc: typeof obj.desc === "string" ? obj.desc : undefined,
    inputs: parsePins(obj.inputs),
    outputs: parsePins(obj.outputs),
    defaults:
      obj.defaults && typeof obj.defaults === "object"
        ? (obj.defaults as Record<string, string | number | boolean>)
        : undefined,
  };
};

type PendingConnection = {
  fromNodeId: string;
  fromPin: string;
};
type PendingCursor = {
  clientX: number;
  clientY: number;
};
type InvalidPinFlash = {
  nodeId: string;
  pinName: string;
  direction: "input" | "output";
  token: number;
};
type HoveredInputPin = {
  nodeId: string;
  pinName: string;
  canConnect: boolean;
};
type ClipboardSnapshot = {
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
};
type DragState = {
  nodeIds: string[];
  startPointerWorldX: number;
  startPointerWorldY: number;
  startNodePositions: Record<string, { x: number; y: number }>;
};
type MarqueeState = {
  startClientX: number;
  startClientY: number;
  currentClientX: number;
  currentClientY: number;
};

const nodeWidth = 220;
const titleHeight = 32;
const pinRowHeight = 24;
const DRAG_DEBUG_KEY = "bp.dragDebug";

const getPinY = (idx: number) => titleHeight + 24 + idx * pinRowHeight + pinRowHeight / 2;
const getNodeHeight = (node: BlueprintNode) =>
  titleHeight + 24 + Math.max(node.inputs.length, node.outputs.length) * pinRowHeight + 24;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const getTargetDebugName = (target: EventTarget | null): string => {
  if (!(target instanceof HTMLElement)) {
    return "unknown";
  }
  const cls = target.className;
  const classText = typeof cls === "string" ? cls.trim().replace(/\s+/g, ".") : "";
  return `${target.tagName.toLowerCase()}${classText ? `.${classText}` : ""}`;
};

const findOutputPin = (node: BlueprintNode | undefined, pinName: string): Pin | undefined =>
  node?.outputs.find((p) => p.name === pinName);

const findInputPin = (node: BlueprintNode | undefined, pinName: string): Pin | undefined =>
  node?.inputs.find((p) => p.name === pinName);
const distributeValues = (sorted: number[], start: number, end: number): number[] => {
  if (sorted.length <= 1) return sorted;
  const step = (end - start) / (sorted.length - 1);
  return sorted.map((_, idx) => start + step * idx);
};
const autoLayoutNodes = (nodes: BlueprintNode[], edges: BlueprintEdge[]): BlueprintNode[] => {
  if (nodes.length === 0) return nodes;
  const idSet = new Set(nodes.map((n) => n.id));
  const out = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const n of nodes) {
    out.set(n.id, []);
    indegree.set(n.id, 0);
  }
  for (const e of edges) {
    if (!idSet.has(e.fromNodeId) || !idSet.has(e.toNodeId)) continue;
    out.get(e.fromNodeId)!.push(e.toNodeId);
    indegree.set(e.toNodeId, (indegree.get(e.toNodeId) ?? 0) + 1);
  }

  const byY = [...nodes].sort((a, b) => a.y - b.y);
  const queue: string[] = byY.filter((n) => (indegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const level = new Map<string, number>();
  for (const id of queue) level.set(id, 0);

  let qi = 0;
  const visited = new Set<string>();
  while (qi < queue.length) {
    const id = queue[qi++];
    visited.add(id);
    const base = level.get(id) ?? 0;
    for (const to of out.get(id) ?? []) {
      level.set(to, Math.max(level.get(to) ?? 0, base + 1));
      const nextIn = (indegree.get(to) ?? 0) - 1;
      indegree.set(to, nextIn);
      if (nextIn === 0) queue.push(to);
    }
  }

  // For cycles/disconnected remains, preserve relative x-order and place after existing levels.
  let maxLevel = 0;
  for (const v of level.values()) maxLevel = Math.max(maxLevel, v);
  const leftovers = [...nodes]
    .filter((n) => !visited.has(n.id))
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  for (const n of leftovers) {
    maxLevel += 1;
    level.set(n.id, maxLevel);
  }

  const buckets = new Map<number, BlueprintNode[]>();
  for (const n of nodes) {
    const lv = level.get(n.id) ?? 0;
    if (!buckets.has(lv)) buckets.set(lv, []);
    buckets.get(lv)!.push(n);
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => a.y - b.y);
  }

  const xStart = 80;
  const yStart = 80;
  const xGap = 320;
  const yGap = 180;
  const nodeSizeY = titleHeight + 24 + 4 * pinRowHeight + 24;

  const placed = new Map<string, { x: number; y: number }>();
  const levels = [...buckets.keys()].sort((a, b) => a - b);
  for (const lv of levels) {
    const list = buckets.get(lv)!;
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      placed.set(n.id, {
        x: xStart + lv * xGap,
        y: yStart + i * Math.max(yGap, nodeSizeY + 24),
      });
    }
  }

  return nodes.map((n) => {
    const p = placed.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });
};

const pinLines = (pins: Pin[]): string => pins.map((p) => `${p.name}:${p.type}`).join("\n");

const parsePinLines = (raw: string): { pins: Pin[]; error?: string } => {
  const lines = raw
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  const pins: Pin[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const [nameRaw, typeRaw] = line.split(":");
    const name = (nameRaw ?? "").trim();
    const type = (typeRaw ?? "").trim();
    if (!name || !type) {
      return { pins: [], error: `Invalid pin line '${line}', expected 'name:type'.` };
    }
    if (seen.has(name)) {
      return { pins: [], error: `Duplicate pin name '${name}'.` };
    }
    seen.add(name);
    pins.push({ name, type });
  }
  return { pins };
};

const validateConnection = (
  doc: BlueprintDocument,
  pending: PendingConnection,
  toNodeId: string,
  toPinName: string
): string | null => {
  const fromNode = doc.graph.nodes.find((n) => n.id === pending.fromNodeId);
  const toNode = doc.graph.nodes.find((n) => n.id === toNodeId);
  if (!fromNode || !toNode) {
    return "Source or target node does not exist.";
  }
  const outPin = findOutputPin(fromNode, pending.fromPin);
  const inPin = findInputPin(toNode, toPinName);
  if (!outPin || !inPin) {
    return "Source or target pin does not exist.";
  }
  if (outPin.type !== inPin.type) {
    return `Pin type mismatch: ${outPin.type} -> ${inPin.type}.`;
  }
  if (
    doc.graph.edges.some(
      (e) =>
        e.fromNodeId === pending.fromNodeId &&
        e.fromPin === pending.fromPin &&
        e.toNodeId === toNodeId &&
        e.toPin === toPinName
    )
  ) {
    return "Connection already exists.";
  }
  // Blueprint rule (MVP): exec input pin has at most one incoming edge.
  if (
    inPin.type === "exec" &&
    doc.graph.edges.some((e) => e.toNodeId === toNodeId && e.toPin === toPinName)
  ) {
    return `Exec input '${toNodeId}.${toPinName}' already has an incoming edge.`;
  }
  return null;
};

const EditorApp = () => {
  const [ready, setReady] = useState(false);
  const [doc, setDoc] = useState<BlueprintDocument>(createDefaultDocument());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingConnection | null>(null);
  const [pendingCursor, setPendingCursor] = useState<PendingCursor | null>(null);
  const [invalidPinFlash, setInvalidPinFlash] = useState<InvalidPinFlash | null>(null);
  const [hoveredInputPin, setHoveredInputPin] = useState<HoveredInputPin | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [connectionHint, setConnectionHint] = useState<string | null>(null);
  const [buildMessage, setBuildMessage] = useState<string>("");
  const [buildIssues, setBuildIssues] = useState<BuildIssue[]>([]);
  const [nodeDefs, setNodeDefs] = useState<NodeDef[]>([]);
  const [activeNodeDef, setActiveNodeDef] = useState<string>("");
  const [findNodeId, setFindNodeId] = useState<string>("");
  const [extensionVersion, setExtensionVersion] = useState<string>("");
  const [focusedEdgeId, setFocusedEdgeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<{ x: number; y: number; scale: number }>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [pan, setPan] = useState<{ startClientX: number; startClientY: number; startX: number; startY: number } | null>(
    null
  );
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [form] = Form.useForm<{ description: string }>();
  const [historyState, setHistoryState] = useState({ index: -1, length: 0 });
  const [collapsedSections, setCollapsedSections] = useState({
    node: false,
    edit: false,
    layout: false,
    canvasBuild: false,
  });
  const [collapsedInspectorPins, setCollapsedInspectorPins] = useState({
    inputs: false,
    outputs: false,
  });
  const clearFocusTimerRef = useRef<number | null>(null);
  const invalidPinTimerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const onDeleteNodeRef = useRef<() => void>(() => { });
  const onDeleteEdgeRef = useRef<() => void>(() => { });
  const onUndoRef = useRef<() => void>(() => { });
  const onRedoRef = useRef<() => void>(() => { });
  const cancelDragRef = useRef<() => void>(() => { });
  const clipboardRef = useRef<ClipboardSnapshot | null>(null);
  const pasteIndexRef = useRef(0);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const skipPushHistoryRef = useRef(false);
  const resetHistoryRef = useRef(false);
  const dragMovedRef = useRef(false);
  const dragDebugLastLogTsRef = useRef(0);
  const latestSerializedRef = useRef("");
  const dragActiveRef = useRef(false);
  const updateFlushTimerRef = useRef<number | null>(null);
  const inspectorFormRef = useRef<HTMLDivElement | null>(null);
  const nodeFinderRef = useRef<{ focus?: () => void } | null>(null);
  const inspectorEditingRef = useRef(false);
  const inspectorFormSyncRef = useRef<{
    id: string;
    description: string;
  } | null>(null);

  const selectedNode = useMemo(
    () => doc.graph.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [doc.graph.nodes, selectedNodeId]
  );

  const serialized = useMemo(() => JSON.stringify(doc, null, 2), [doc]);
  const syncHistoryState = () =>
    setHistoryState({ index: historyIndexRef.current, length: historyRef.current.length });
  const pushHistorySnapshot = (snapshot: string) => {
    const stack = historyRef.current;
    if (historyIndexRef.current >= 0 && stack[historyIndexRef.current] === snapshot) {
      return;
    }
    stack.splice(historyIndexRef.current + 1);
    stack.push(snapshot);
    historyIndexRef.current = stack.length - 1;
    syncHistoryState();
  };
  const commitInspectorHistoryIfEnded = () => {
    window.setTimeout(() => {
      const root = inspectorFormRef.current;
      const active = document.activeElement;
      if (root && active instanceof HTMLElement && root.contains(active)) {
        return;
      }
      if (!inspectorEditingRef.current) {
        return;
      }
      inspectorEditingRef.current = false;
      setDoc((prev) => {
        pushHistorySnapshot(JSON.stringify(prev, null, 2));
        return prev;
      });
    }, 0);
  };
  const selectedLookup = useMemo(() => {
    const map = new Map<string, BlueprintNode>();
    for (const n of doc.graph.nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [doc.graph.nodes]);
  const edgeLookup = useMemo(() => {
    const map = new Map<string, BlueprintEdge>();
    for (const e of doc.graph.edges) {
      map.set(e.id, e);
    }
    return map;
  }, [doc.graph.edges]);
  const nodeOrderIndex = useMemo(() => {
    const map = new Map<string, number>();
    doc.graph.nodes.forEach((n, idx) => map.set(n.id, idx));
    return map;
  }, [doc.graph.nodes]);
  const nodeTreeState = useMemo(() => {
    const allNodeIds = doc.graph.nodes.map((n) => n.id);
    const rootId = doc.graph.nodes.find((n) => n.isRoot)?.id ?? null;
    const undirected = new Map<string, Set<string>>();
    const directedOut = new Map<string, Set<string>>();
    for (const id of allNodeIds) {
      undirected.set(id, new Set<string>());
      directedOut.set(id, new Set<string>());
    }
    for (const e of doc.graph.edges) {
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
    for (const e of doc.graph.edges) {
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
  }, [doc.graph.nodes, doc.graph.edges, nodeOrderIndex]);
  const clientToWorld = (clientX: number, clientY: number) => {
    if (!canvasRef.current) {
      return { x: 0, y: 0 };
    }
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.x) / viewport.scale,
      y: (clientY - rect.top - viewport.y) / viewport.scale,
    };
  };
  const isDragDebugEnabled = () => {
    try {
      return window.localStorage.getItem(DRAG_DEBUG_KEY) === "1";
    } catch {
      return false;
    }
  };
  const templateOptions = useMemo(() => {
    const groups = new Map<string, Array<{ label: string; value: string }>>();
    for (const def of nodeDefs) {
      const group = def.category?.trim() || "General";
      const label = def.title || def.name;
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push({ label, value: def.name });
    }
    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, options]) => ({
        label,
        options: options.sort((a, b) => a.label.localeCompare(b.label)),
      }));
  }, [nodeDefs]);
  const nodeSearchOptions = useMemo(
    () =>
      doc.graph.nodes
        .map((n) => ({
          value: n.id,
          label: `${n.title || n.id} (${n.id})`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [doc.graph.nodes]
  );

  useEffect(() => {
    latestSerializedRef.current = serialized;
  }, [serialized]);

  useEffect(() => {
    dragActiveRef.current = !!drag;
  }, [drag]);

  useEffect(() => {
    if (!selectedNode) {
      inspectorFormSyncRef.current = null;
      form.resetFields();
      return;
    }
    const next = {
      id: selectedNode.id,
      description: selectedNode.description ?? "",
    };
    const prev = inspectorFormSyncRef.current;
    if (prev && prev.id === next.id && prev.description === next.description) {
      return;
    }
    inspectorFormSyncRef.current = next;
    form.setFieldsValue({
      description: next.description,
    });
  }, [selectedNode, form]);

  useEffect(() => {
    if (findNodeId && !doc.graph.nodes.some((n) => n.id === findNodeId)) {
      setFindNodeId("");
    }
  }, [doc.graph.nodes, findNodeId]);

  useEffect(() => {
    if (!pending) {
      setPendingCursor(null);
      setHoveredInputPin(null);
    }
  }, [pending]);

  useEffect(() => {
    const off = vscodeApi.onMessage((msg) => {
      if (msg.type === "init") {
        setTheme(msg.theme);
        setDoc(parseDocument(msg.content));
        setExtensionVersion(msg.extensionVersion ?? "");
        resetHistoryRef.current = true;
        const defs = (msg.nodeDefs ?? []).map(normalizeNodeDef).filter((v): v is NodeDef => !!v);
        setNodeDefs(defs);
        if (defs.length > 0) {
          setActiveNodeDef(defs[0].name);
        }
        setReady(true);
      } else if (msg.type === "fileChanged") {
        const parsed = parseDocument(msg.content);
        const nextSerialized = JSON.stringify(parsed, null, 2);
        if (dragActiveRef.current) {
          if (isDragDebugEnabled()) {
            console.debug("[bp-drag] ignored fileChanged during drag");
          }
          return;
        }
        if (nextSerialized === latestSerializedRef.current) {
          return;
        }
        setDoc(parsed);
        resetHistoryRef.current = true;
        setSelectedEdgeId(null);
      } else if (msg.type === "buildResult") {
        setBuildMessage(msg.message);
        setBuildIssues(msg.issues ?? []);
      } else if (msg.type === "settingLoaded") {
        const defs = (msg.nodeDefs ?? []).map(normalizeNodeDef).filter((v): v is NodeDef => !!v);
        setNodeDefs(defs);
        setActiveNodeDef((prev) => {
          if (defs.length === 0) return "";
          if (prev && defs.some((d) => d.name === prev)) return prev;
          return defs[0].name;
        });
      }
    });
    vscodeApi.postMessage({ type: "ready" });
    return off;
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (resetHistoryRef.current) {
      resetHistoryRef.current = false;
      historyRef.current = [serialized];
      historyIndexRef.current = 0;
      syncHistoryState();
      return;
    }
    if (skipPushHistoryRef.current) {
      skipPushHistoryRef.current = false;
      syncHistoryState();
      return;
    }
    pushHistorySnapshot(serialized);
  }, [serialized, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (updateFlushTimerRef.current !== null) {
      window.clearTimeout(updateFlushTimerRef.current);
      updateFlushTimerRef.current = null;
    }
    // Debounce update traffic to avoid Cursor sync rate limiting.
    const delay = drag ? 240 : 120;
    updateFlushTimerRef.current = window.setTimeout(() => {
      vscodeApi.postMessage({ type: "update", content: serialized });
      updateFlushTimerRef.current = null;
    }, delay);
    return () => {
      if (updateFlushTimerRef.current !== null) {
        window.clearTimeout(updateFlushTimerRef.current);
        updateFlushTimerRef.current = null;
      }
    };
  }, [serialized, ready, drag]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const w = window as Window & {
      __bpSetDragDebug?: (enabled: boolean) => void;
      __bpGetDragDebug?: () => boolean;
    };
    w.__bpSetDragDebug = (enabled: boolean) => {
      try {
        window.localStorage.setItem(DRAG_DEBUG_KEY, enabled ? "1" : "0");
      } catch {
        // ignore
      }
      console.info(`[bp-drag] debug ${enabled ? "enabled" : "disabled"}`);
    };
    w.__bpGetDragDebug = () => isDragDebugEnabled();
    return () => {
      delete w.__bpSetDragDebug;
      delete w.__bpGetDragDebug;
    };
  }, []);

  useEffect(() => {
    if (!drag) {
      return;
    }
    const onMove = (e: MouseEvent) => {
      const world = clientToWorld(e.clientX, e.clientY);
      const dx = world.x - drag.startPointerWorldX;
      const dy = world.y - drag.startPointerWorldY;
      if (isDragDebugEnabled()) {
        const now = Date.now();
        if (now - dragDebugLastLogTsRef.current > 80) {
          dragDebugLastLogTsRef.current = now;
          console.debug("[bp-drag] move", {
            target: getTargetDebugName(e.target),
            clientX: e.clientX,
            clientY: e.clientY,
            worldX: world.x,
            worldY: world.y,
            dx,
            dy,
            dragNodeIds: drag.nodeIds,
          });
        }
      }
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        dragMovedRef.current = true;
      }
      // Dragging updates are preview-like; commit one history entry on mouse up.
      skipPushHistoryRef.current = true;
      setDoc((prev) => ({
        ...prev,
        graph: {
          ...prev.graph,
          nodes: prev.graph.nodes.map((n) =>
            drag.nodeIds.includes(n.id)
              ? {
                ...n,
                x: Math.max(16, (drag.startNodePositions[n.id]?.x ?? n.x) + dx),
                y: Math.max(16, (drag.startNodePositions[n.id]?.y ?? n.y) + dy),
              }
              : n
          ),
        },
      }));
    };
    const onUp = () => {
      if (isDragDebugEnabled()) {
        console.debug("[bp-drag] up", {
          moved: dragMovedRef.current,
          dragNodeIds: drag.nodeIds,
        });
      }
      setDrag(null);
      if (dragMovedRef.current) {
        setDoc((prev) => {
          pushHistorySnapshot(JSON.stringify(prev, null, 2));
          return prev;
        });
      }
      dragMovedRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, viewport.x, viewport.y, viewport.scale]);
  cancelDragRef.current = () => {
    if (!drag) {
      return;
    }
    // Escape during drag restores pre-drag node positions.
    skipPushHistoryRef.current = true;
    setDoc((prev) => ({
      ...prev,
      graph: {
        ...prev.graph,
        nodes: prev.graph.nodes.map((n) => {
          const start = drag.startNodePositions[n.id];
          return start ? { ...n, x: start.x, y: start.y } : n;
        }),
      },
    }));
    dragMovedRef.current = false;
    setDrag(null);
  };

  useEffect(() => {
    if (!marquee || !canvasRef.current) {
      return;
    }
    const onMove = (e: MouseEvent) => {
      setMarquee((prev) =>
        prev
          ? {
            ...prev,
            currentClientX: e.clientX,
            currentClientY: e.clientY,
          }
          : prev
      );
    };
    const onUp = () => {
      if (!canvasRef.current) {
        setMarquee(null);
        return;
      }
      const rect = canvasRef.current.getBoundingClientRect();
      const minX = Math.min(marquee.startClientX, marquee.currentClientX) - rect.left;
      const maxX = Math.max(marquee.startClientX, marquee.currentClientX) - rect.left;
      const minY = Math.min(marquee.startClientY, marquee.currentClientY) - rect.top;
      const maxY = Math.max(marquee.startClientY, marquee.currentClientY) - rect.top;
      const hits = doc.graph.nodes
        .filter((node) => {
          const left = node.x * viewport.scale + viewport.x;
          const top = node.y * viewport.scale + viewport.y;
          const width = nodeWidth * viewport.scale;
          const height = getNodeHeight(node) * viewport.scale;
          return left <= maxX && left + width >= minX && top <= maxY && top + height >= minY;
        })
        .map((n) => n.id);
      setSelectedNodeIds(hits);
      setSelectedNodeId(hits[0] ?? null);
      setMarquee(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [marquee, doc.graph.nodes, viewport.scale, viewport.x, viewport.y]);

  useEffect(() => {
    if (!pan) {
      return;
    }
    const onMove = (e: MouseEvent) => {
      setViewport((prev) => ({
        ...prev,
        x: pan.startX + (e.clientX - pan.startClientX),
        y: pan.startY + (e.clientY - pan.startClientY),
      }));
    };
    const onUp = () => setPan(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [pan]);

  useEffect(() => {
    if (!nodeContextMenu) {
      return;
    }
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(".bp-node-context-menu")) {
        return;
      }
      setNodeContextMenu(null);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [nodeContextMenu]);

  useEffect(() => {
    return () => {
      if (clearFocusTimerRef.current !== null) {
        window.clearTimeout(clearFocusTimerRef.current);
      }
      if (invalidPinTimerRef.current !== null) {
        window.clearTimeout(invalidPinTimerRef.current);
      }
      if (updateFlushTimerRef.current !== null) {
        window.clearTimeout(updateFlushTimerRef.current);
      }
    };
  }, []);

  const onAddNode = () => {
    const template = nodeDefs.find((d) => d.name === activeNodeDef);
    const id = `node_${Math.random().toString(36).slice(2, 8)}`;
    const inputs = template?.inputs ?? [{ name: "in", type: "exec" }];
    const outputs = template?.outputs ?? [{ name: "out", type: "exec" }];
    setDoc((prev) => ({
      ...prev,
      graph: {
        ...prev.graph,
        nodes: [
          ...prev.graph.nodes,
          {
            id,
            title: template?.title || template?.name || "New Node",
            description: template?.desc ?? "",
            isRoot: false,
            x: 160 + prev.graph.nodes.length * 24,
            y: 160 + prev.graph.nodes.length * 16,
            inputs,
            outputs,
            values: template?.defaults
              ? Object.fromEntries(
                Object.entries(template.defaults).map(([k, v]) => [k, String(v)])
              )
              : undefined,
          },
        ],
      },
    }));
    setSelectedNodeId(id);
  };

  const onDeleteNode = () => {
    const targets = selectedNodeIds.length > 0 ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : [];
    if (targets.length === 0) {
      return;
    }
    setDoc((prev) => ({
      ...prev,
      graph: {
        ...prev.graph,
        nodes: prev.graph.nodes.filter((n) => !targets.includes(n.id)),
        edges: prev.graph.edges.filter(
          (e) => !targets.includes(e.fromNodeId) && !targets.includes(e.toNodeId)
        ),
      },
    }));
    setSelectedNodeIds([]);
    setSelectedNodeId(null);
    setNodeContextMenu(null);
  };
  onDeleteNodeRef.current = onDeleteNode;

  const onUndo = () => {
    if (historyIndexRef.current <= 0) {
      return;
    }
    const nextIndex = historyIndexRef.current - 1;
    const snapshot = historyRef.current[nextIndex];
    if (!snapshot) {
      return;
    }
    historyIndexRef.current = nextIndex;
    skipPushHistoryRef.current = true;
    setDoc(parseDocument(snapshot));
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setConnectionHint(null);
    setPending(null);
    setFocusedEdgeId(null);
    syncHistoryState();
  };
  const onRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) {
      return;
    }
    const nextIndex = historyIndexRef.current + 1;
    const snapshot = historyRef.current[nextIndex];
    if (!snapshot) {
      return;
    }
    historyIndexRef.current = nextIndex;
    skipPushHistoryRef.current = true;
    setDoc(parseDocument(snapshot));
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setConnectionHint(null);
    setPending(null);
    setFocusedEdgeId(null);
    syncHistoryState();
  };
  onUndoRef.current = onUndo;
  onRedoRef.current = onRedo;

  const onAlignSelection = (
    mode: "left" | "right" | "top" | "bottom" | "h-distribute" | "v-distribute"
  ) => {
    const targets = selectedNodeIds.length > 1 ? selectedNodeIds : [];
    if (targets.length < 2) {
      return;
    }
    setDoc((prev) => {
      const selected = prev.graph.nodes.filter((n) => targets.includes(n.id));
      if (selected.length < 2) {
        return prev;
      }
      const xs = selected.map((n) => n.x);
      const ys = selected.map((n) => n.y);
      const left = Math.min(...xs);
      const right = Math.max(...xs);
      const top = Math.min(...ys);
      const bottom = Math.max(...ys);
      let xMap = new Map<string, number>();
      let yMap = new Map<string, number>();
      if (mode === "left") {
        for (const n of selected) xMap.set(n.id, left);
      } else if (mode === "right") {
        for (const n of selected) xMap.set(n.id, right);
      } else if (mode === "top") {
        for (const n of selected) yMap.set(n.id, top);
      } else if (mode === "bottom") {
        for (const n of selected) yMap.set(n.id, bottom);
      } else if (mode === "h-distribute") {
        const ordered = [...selected].sort((a, b) => a.x - b.x);
        const distributed = distributeValues(ordered.map((n) => n.x), left, right);
        for (let i = 0; i < ordered.length; i++) {
          xMap.set(ordered[i].id, distributed[i]);
        }
      } else if (mode === "v-distribute") {
        const ordered = [...selected].sort((a, b) => a.y - b.y);
        const distributed = distributeValues(ordered.map((n) => n.y), top, bottom);
        for (let i = 0; i < ordered.length; i++) {
          yMap.set(ordered[i].id, distributed[i]);
        }
      }
      return {
        ...prev,
        graph: {
          ...prev.graph,
          nodes: prev.graph.nodes.map((n) =>
            targets.includes(n.id)
              ? {
                ...n,
                x: xMap.has(n.id) ? xMap.get(n.id)! : n.x,
                y: yMap.has(n.id) ? yMap.get(n.id)! : n.y,
              }
              : n
          ),
        },
      };
    });
  };
  const onAutoLayout = () => {
    setDoc((prev) => ({
      ...prev,
      graph: {
        ...prev.graph,
        nodes: autoLayoutNodes(prev.graph.nodes, prev.graph.edges),
      },
    }));
    setConnectionHint(null);
    setPending(null);
    setNodeContextMenu(null);
  };
  const onSetRootNode = (nodeId: string) => {
    if (!nodeTreeState.canSetAsRoot.has(nodeId)) {
      setConnectionHint("Only a tree root node (without incoming links) can be set as root.");
      setNodeContextMenu(null);
      return;
    }
    setDoc((prev) => ({
      ...prev,
      graph: {
        ...prev.graph,
        nodes: prev.graph.nodes.map((n) => ({
          ...n,
          isRoot: n.id === nodeId,
        })),
      },
    }));
    setSelectedNodeId(nodeId);
    setSelectedNodeIds([nodeId]);
    setSelectedEdgeId(null);
    setConnectionHint(null);
    setNodeContextMenu(null);
  };
  const toggleSection = (key: "node" | "edit" | "layout" | "canvasBuild") => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const toggleInspectorPins = (key: "inputs" | "outputs") => {
    setCollapsedInspectorPins((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onOutputPinClick = (nodeId: string, pinName: string, cursor?: PendingCursor) => {
    setConnectionHint(null);
    setPending({ fromNodeId: nodeId, fromPin: pinName });
    if (cursor) {
      setPendingCursor(cursor);
    }
  };

  const onInputPinClick = (nodeId: string, pinName: string) => {
    if (!pending || pending.fromNodeId === nodeId) {
      return;
    }
    const reason = validateConnection(doc, pending, nodeId, pinName);
    if (reason) {
      setConnectionHint(reason);
      if (invalidPinTimerRef.current !== null) {
        window.clearTimeout(invalidPinTimerRef.current);
      }
      const token = Date.now();
      setInvalidPinFlash({ nodeId, pinName, direction: "input", token });
      invalidPinTimerRef.current = window.setTimeout(() => {
        setInvalidPinFlash((prev) => (prev && prev.token === token ? null : prev));
      }, 700);
      return;
    }
    const edgeId = `${pending.fromNodeId}:${pending.fromPin}->${nodeId}:${pinName}`;
    setDoc((prev) => {
      if (prev.graph.edges.some((e) => e.id === edgeId)) {
        return prev;
      }
      return {
        ...prev,
        graph: {
          ...prev.graph,
          edges: [
            ...prev.graph.edges,
            {
              id: edgeId,
              fromNodeId: pending.fromNodeId,
              fromPin: pending.fromPin,
              toNodeId: nodeId,
              toPin: pinName,
            },
          ],
        },
      };
    });
    setConnectionHint(null);
    setPending(null);
    setHoveredInputPin(null);
    setSelectedEdgeId(null);
  };

  const onDeleteEdge = (edgeId: string) => {
    setDoc((prev) => ({
      ...prev,
      graph: {
        ...prev.graph,
        edges: prev.graph.edges.filter((e) => e.id !== edgeId),
      },
    }));
    setConnectionHint(null);
    setPending(null);
    setSelectedEdgeId(null);
    setNodeContextMenu(null);
  };
  onDeleteEdgeRef.current = () => {
    if (!selectedEdgeId) {
      return;
    }
    onDeleteEdge(selectedEdgeId);
  };
  const onEditPinDefaultValue = (nodeId: string, pinName: string, nextValue: string) => {
    // Batch inspector edits into one undo step when input blurs.
    skipPushHistoryRef.current = true;
    setDoc((prev) => ({
      ...prev,
      graph: {
        ...prev.graph,
        nodes: prev.graph.nodes.map((n) => {
          if (n.id !== nodeId) {
            return n;
          }
          const values = { ...(n.values ?? {}) };
          if (nextValue.trim() === "") {
            delete values[pinName];
          } else {
            values[pinName] = nextValue;
          }
          return {
            ...n,
            values: Object.keys(values).length > 0 ? values : undefined,
          };
        }),
      },
    }));
  };
  const renderDefaultValueEditor = (nodeId: string, pin: Pin) => {
    const current = selectedLookup.get(nodeId)?.values?.[pin.name] ?? "";
    const pinType = pin.type.trim().toLowerCase();
    if (pinType === "number" || pinType === "int" || pinType === "float") {
      const num = current.trim() === "" ? null : Number(current);
      return (
        <InputNumber
          style={{ width: "100%" }}
          value={Number.isFinite(num as number) ? (num as number) : null}
          placeholder={pinType === "int" ? "0" : "0.0"}
          onFocus={() => {
            inspectorEditingRef.current = true;
          }}
          onBlur={commitInspectorHistoryIfEnded}
          onChange={(v) => onEditPinDefaultValue(nodeId, pin.name, v === null ? "" : String(v))}
        />
      );
    }
    if (pinType === "bool" || pinType === "boolean") {
      const checked = current.trim().toLowerCase() === "true";
      return (
        <div
          className="bp-default-bool"
          onFocusCapture={() => {
            inspectorEditingRef.current = true;
          }}
          onBlurCapture={commitInspectorHistoryIfEnded}
        >
          <Switch
            checked={checked}
            onChange={(v) => onEditPinDefaultValue(nodeId, pin.name, v ? "true" : "false")}
          />
          <Typography.Text type="secondary">{checked ? "true" : "false"}</Typography.Text>
        </div>
      );
    }
    return (
      <Input
        value={current}
        placeholder="(empty)"
        onFocus={() => {
          inspectorEditingRef.current = true;
        }}
        onBlur={commitInspectorHistoryIfEnded}
        onChange={(e) => onEditPinDefaultValue(nodeId, pin.name, e.target.value)}
      />
    );
  };
  const focusNodeById = (nodeId: string) => {
    const node = selectedLookup.get(nodeId);
    if (!node || !canvasRef.current) {
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const centerWorldX = node.x + nodeWidth / 2;
    const centerWorldY = node.y + getNodeHeight(node) / 2;
    const targetX = rect.width / 2 - centerWorldX * viewport.scale;
    const targetY = rect.height / 2 - centerWorldY * viewport.scale;
    setSelectedNodeId(nodeId);
    setSelectedNodeIds([nodeId]);
    setSelectedEdgeId(null);
    setViewport((prev) => ({ ...prev, x: targetX, y: targetY }));
    setConnectionHint(null);
    setPending(null);
  };
  const onFocusFoundNode = () => {
    if (!findNodeId) {
      return;
    }
    focusNodeById(findNodeId);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest(".ant-select-dropdown"))
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      const withMeta = e.ctrlKey || e.metaKey;
      if ((e.key === "Delete" || e.key === "Backspace") && (selectedNodeId || selectedNodeIds.length > 0)) {
        e.preventDefault();
        onDeleteNodeRef.current();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedEdgeId) {
        e.preventDefault();
        onDeleteEdgeRef.current();
        return;
      }
      if (withMeta && key === "z" && !e.shiftKey) {
        e.preventDefault();
        onUndoRef.current();
        return;
      }
      if ((withMeta && key === "z" && e.shiftKey) || (e.ctrlKey && key === "y")) {
        e.preventDefault();
        onRedoRef.current();
        return;
      }
      if (withMeta && key === "a") {
        e.preventDefault();
        const all = doc.graph.nodes.map((n) => n.id);
        setSelectedNodeIds(all);
        setSelectedNodeId(all[0] ?? null);
        setSelectedEdgeId(null);
        return;
      }
      if (withMeta && key === "f") {
        e.preventDefault();
        nodeFinderRef.current?.focus?.();
        return;
      }
      if (withMeta && key === "c") {
        const targets = selectedNodeIds.length > 0 ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : [];
        if (targets.length === 0) {
          return;
        }
        e.preventDefault();
        const selected = doc.graph.nodes.filter((n) => targets.includes(n.id));
        const set = new Set(targets);
        const linked = doc.graph.edges.filter((edge) => set.has(edge.fromNodeId) && set.has(edge.toNodeId));
        clipboardRef.current = {
          nodes: selected.map((n) => cloneDocument({ formatVersion: 1, graph: { id: "", name: "", nodes: [n], edges: [], variables: [] }, metadata: {} }).graph.nodes[0]),
          edges: linked.map((edge) => ({ ...edge })),
        };
        return;
      }
      if (withMeta && key === "v") {
        const clip = clipboardRef.current;
        if (!clip || clip.nodes.length === 0) {
          return;
        }
        e.preventDefault();
        pasteIndexRef.current += 1;
        const offset = 28 * pasteIndexRef.current;
        setDoc((prev) => {
          const usedNodeIds = new Set(prev.graph.nodes.map((n) => n.id));
          const usedEdgeIds = new Set(prev.graph.edges.map((edge) => edge.id));
          const idMap = new Map<string, string>();
          const newNodes: BlueprintNode[] = [];
          const newEdges: BlueprintEdge[] = [];
          for (const node of clip.nodes) {
            let nextId = `${node.id}_copy`;
            let idx = 1;
            while (usedNodeIds.has(nextId)) {
              nextId = `${node.id}_copy${idx++}`;
            }
            usedNodeIds.add(nextId);
            idMap.set(node.id, nextId);
            newNodes.push({
              ...node,
              id: nextId,
              isRoot: false,
              x: node.x + offset,
              y: node.y + offset,
              inputs: node.inputs.map((p) => ({ ...p })),
              outputs: node.outputs.map((p) => ({ ...p })),
              values: node.values ? { ...node.values } : undefined,
            });
          }
          for (const edge of clip.edges) {
            const fromNodeId = idMap.get(edge.fromNodeId);
            const toNodeId = idMap.get(edge.toNodeId);
            if (!fromNodeId || !toNodeId) {
              continue;
            }
            let nextEdgeId = `${edge.id}_copy`;
            let idx = 1;
            while (usedEdgeIds.has(nextEdgeId)) {
              nextEdgeId = `${edge.id}_copy${idx++}`;
            }
            usedEdgeIds.add(nextEdgeId);
            newEdges.push({
              ...edge,
              id: nextEdgeId,
              fromNodeId,
              toNodeId,
            });
          }
          const pastedIds = newNodes.map((n) => n.id);
          setSelectedNodeIds(pastedIds);
          setSelectedNodeId(pastedIds[0] ?? null);
          setSelectedEdgeId(null);
          return {
            ...prev,
            graph: {
              ...prev.graph,
              nodes: [...prev.graph.nodes, ...newNodes],
              edges: [...prev.graph.edges, ...newEdges],
            },
          };
        });
        return;
      }
      if (withMeta && key === "0") {
        e.preventDefault();
        setViewport({ x: 0, y: 0, scale: 1 });
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (drag) {
          cancelDragRef.current();
          return;
        }
        setNodeContextMenu(null);
        setPending(null);
        setConnectionHint(null);
        setSelectedNodeIds([]);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setFocusedEdgeId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [doc, selectedNodeId, selectedNodeIds, selectedEdgeId, drag]);

  const focusIssue = (issue: BuildIssue) => {
    let nodeToCenter: BlueprintNode | null = null;
    if (issue.nodeId) {
      setSelectedNodeId(issue.nodeId);
      setSelectedNodeIds([issue.nodeId]);
      nodeToCenter = selectedLookup.get(issue.nodeId) ?? null;
    } else if (issue.edgeId) {
      const edge = edgeLookup.get(issue.edgeId);
      if (edge) {
        setSelectedNodeId(edge.toNodeId || edge.fromNodeId);
        setSelectedNodeIds([edge.toNodeId || edge.fromNodeId]);
        setSelectedEdgeId(edge.id);
        nodeToCenter = selectedLookup.get(edge.toNodeId) ?? selectedLookup.get(edge.fromNodeId) ?? null;
      }
    }
    if (nodeToCenter && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const centerWorldX = nodeToCenter.x + nodeWidth / 2;
      const centerWorldY = nodeToCenter.y + getNodeHeight(nodeToCenter) / 2;
      const targetX = rect.width / 2 - centerWorldX * viewport.scale;
      const targetY = rect.height / 2 - centerWorldY * viewport.scale;
      setViewport((prev) => ({ ...prev, x: targetX, y: targetY }));
    }
    if (issue.edgeId) {
      setFocusedEdgeId(issue.edgeId);
      if (clearFocusTimerRef.current !== null) {
        window.clearTimeout(clearFocusTimerRef.current);
      }
      clearFocusTimerRef.current = window.setTimeout(() => {
        setFocusedEdgeId(null);
      }, 2200);
    }
    setConnectionHint(issue.message);
  };

  const edgePath = (edge: BlueprintEdge) => {
    const from = selectedLookup.get(edge.fromNodeId);
    const to = selectedLookup.get(edge.toNodeId);
    if (!from || !to) {
      return null;
    }
    const fromIdx = from.outputs.findIndex((p) => p.name === edge.fromPin);
    const toIdx = to.inputs.findIndex((p) => p.name === edge.toPin);
    const x1 = (from.x + nodeWidth) * viewport.scale + viewport.x;
    const y1 = (from.y + getPinY(Math.max(0, fromIdx))) * viewport.scale + viewport.y;
    const x2 = to.x * viewport.scale + viewport.x;
    const y2 = (to.y + getPinY(Math.max(0, toIdx))) * viewport.scale + viewport.y;
    const dx = Math.max(80, Math.abs(x2 - x1) * 0.5);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };
  const pendingEdgePath = useMemo(() => {
    if (!pending || !pendingCursor || !canvasRef.current) {
      return null;
    }
    const from = selectedLookup.get(pending.fromNodeId);
    if (!from) {
      return null;
    }
    const fromIdx = from.outputs.findIndex((p) => p.name === pending.fromPin);
    const x1 = (from.x + nodeWidth) * viewport.scale + viewport.x;
    const y1 = (from.y + getPinY(Math.max(0, fromIdx))) * viewport.scale + viewport.y;
    const rect = canvasRef.current.getBoundingClientRect();
    let x2 = pendingCursor.clientX - rect.left;
    let y2 = pendingCursor.clientY - rect.top;
    if (hoveredInputPin) {
      const targetNode = selectedLookup.get(hoveredInputPin.nodeId);
      if (targetNode) {
        const targetPinIdx = targetNode.inputs.findIndex((p) => p.name === hoveredInputPin.pinName);
        x2 = targetNode.x * viewport.scale + viewport.x;
        y2 = (targetNode.y + getPinY(Math.max(0, targetPinIdx))) * viewport.scale + viewport.y;
      }
    }
    const dx = Math.max(80, Math.abs(x2 - x1) * 0.5);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }, [pending, pendingCursor, hoveredInputPin, selectedLookup, viewport.scale, viewport.x, viewport.y]);

  const issueNodeIds = useMemo(() => {
    const set = new Set<string>();
    for (const issue of buildIssues) {
      if (issue.nodeId) {
        set.add(issue.nodeId);
      }
    }
    return set;
  }, [buildIssues]);

  const issueEdgeIds = useMemo(() => {
    const set = new Set<string>();
    for (const issue of buildIssues) {
      if (issue.edgeId) {
        set.add(issue.edgeId);
      }
    }
    return set;
  }, [buildIssues]);

  return (
    <App className="bp-root">
      <div className="bp-main">
        <div className="bp-toolbox">
          <div className="bp-toolbox-section">
            <div className="bp-toolbox-header">
              <Typography.Text className="bp-toolbox-title">Node</Typography.Text>
              <Button className="bp-collapse-btn" size="small" onClick={() => toggleSection("node")}>
                {collapsedSections.node ? "Expand" : "Collapse"}
              </Button>
            </div>
            {!collapsedSections.node ? (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Select
                  style={{ width: "100%" }}
                  placeholder="Select node template"
                  value={activeNodeDef || undefined}
                  options={templateOptions}
                  onChange={setActiveNodeDef}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                />
                <Select
                  ref={nodeFinderRef as unknown as React.Ref<any>}
                  style={{ width: "100%" }}
                  placeholder="Find node (Ctrl/Cmd+F)"
                  value={findNodeId || undefined}
                  options={nodeSearchOptions}
                  onChange={(v) => setFindNodeId(String(v))}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                />
                <Button block onClick={onFocusFoundNode} disabled={!findNodeId}>
                  Focus Node
                </Button>
                <Button type="primary" block onClick={onAddNode}>
                  Add Node
                </Button>
                <Button block onClick={onDeleteNode} disabled={selectedNodeIds.length === 0}>
                  Delete Node
                </Button>
                <Button block onClick={() => selectedEdgeId && onDeleteEdge(selectedEdgeId)} disabled={!selectedEdgeId}>
                  Delete Edge
                </Button>
              </Space>
            ) : null}
          </div>

          <div className="bp-toolbox-section">
            <div className="bp-toolbox-header">
              <Typography.Text className="bp-toolbox-title">Edit</Typography.Text>
              <Button className="bp-collapse-btn" size="small" onClick={() => toggleSection("edit")}>
                {collapsedSections.edit ? "Expand" : "Collapse"}
              </Button>
            </div>
            {!collapsedSections.edit ? (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Button block onClick={onUndo} disabled={historyState.index <= 0}>
                  Undo
                </Button>
                <Button
                  block
                  onClick={onRedo}
                  disabled={historyState.index < 0 || historyState.index >= historyState.length - 1}
                >
                  Redo
                </Button>
              </Space>
            ) : null}
          </div>

          <div className="bp-toolbox-section">
            <div className="bp-toolbox-header">
              <Typography.Text className="bp-toolbox-title">Layout</Typography.Text>
              <Button className="bp-collapse-btn" size="small" onClick={() => toggleSection("layout")}>
                {collapsedSections.layout ? "Expand" : "Collapse"}
              </Button>
            </div>
            {!collapsedSections.layout ? (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Button block onClick={() => onAlignSelection("left")} disabled={selectedNodeIds.length < 2}>
                  Align Left
                </Button>
                <Button block onClick={() => onAlignSelection("right")} disabled={selectedNodeIds.length < 2}>
                  Align Right
                </Button>
                <Button block onClick={() => onAlignSelection("top")} disabled={selectedNodeIds.length < 2}>
                  Align Top
                </Button>
                <Button block onClick={() => onAlignSelection("bottom")} disabled={selectedNodeIds.length < 2}>
                  Align Bottom
                </Button>
                <Button block onClick={() => onAlignSelection("h-distribute")} disabled={selectedNodeIds.length < 3}>
                  Distribute H
                </Button>
                <Button block onClick={() => onAlignSelection("v-distribute")} disabled={selectedNodeIds.length < 3}>
                  Distribute V
                </Button>
                <Button block onClick={onAutoLayout} disabled={doc.graph.nodes.length < 2}>
                  Auto Layout
                </Button>
              </Space>
            ) : null}
          </div>

          <div className="bp-toolbox-section">
            <div className="bp-toolbox-header">
              <Typography.Text className="bp-toolbox-title">Canvas & Build</Typography.Text>
              <Button className="bp-collapse-btn" size="small" onClick={() => toggleSection("canvasBuild")}>
                {collapsedSections.canvasBuild ? "Expand" : "Collapse"}
              </Button>
            </div>
            {!collapsedSections.canvasBuild ? (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Button block onClick={() => setViewport({ x: 0, y: 0, scale: 1 })}>
                  Reset View
                </Button>
                <Button block onClick={() => vscodeApi.postMessage({ type: "requestSetting" })}>
                  Reload Node Defs
                </Button>
                <Button block onClick={() => vscodeApi.postMessage({ type: "build" })}>
                  Build
                </Button>
                {pending ? (
                  <Tag color="processing">
                    Connecting from `{pending.fromNodeId}.{pending.fromPin}` (click an input pin)
                  </Tag>
                ) : (
                  <Tag>Click output pin to start connection</Tag>
                )}
                {selectedNodeIds.length > 1 ? <Tag color="processing">Selected {selectedNodeIds.length}</Tag> : null}
                {connectionHint ? <Tag color="error">{connectionHint}</Tag> : null}
                <Tag>Zoom {Math.round(viewport.scale * 100)}%</Tag>
                <Tag>Shortcuts: Del | Ctrl/Cmd+Z/Y | Ctrl/Cmd+A | Ctrl/Cmd+F | Ctrl/Cmd+0 | Esc</Tag>
              </Space>
            ) : null}
          </div>
        </div>
        <div className="bp-inspector">
          <div className="bp-inspector-version">
            <Typography.Text type="secondary">
              Blueprint Editor {extensionVersion ? `v${extensionVersion}` : ""}
            </Typography.Text>
          </div>
          <Typography.Title level={5}>Inspector</Typography.Title>
          <Divider />
          {selectedNode ? (
            <div ref={inspectorFormRef}>
              <Form
                form={form}
                layout="vertical"
                onValuesChange={(v) => {
                  if (!Object.prototype.hasOwnProperty.call(v, "description")) {
                    return;
                  }
                  const description = String(v.description ?? "");
                  // Batch inspector description edits into one undo step on blur.
                  skipPushHistoryRef.current = true;
                  setDoc((prev) => ({
                    ...prev,
                    graph: {
                      ...prev.graph,
                      nodes: prev.graph.nodes.map((n) =>
                        n.id === selectedNode.id
                          ? {
                            ...n,
                            description,
                          }
                          : n
                      ),
                    },
                  }));
                }}
              >
                <Form.Item label="Node Id">
                  <Input value={selectedNode.id} readOnly />
                </Form.Item>
                <Form.Item label="Title">
                  <Input value={selectedNode.title} readOnly />
                </Form.Item>
                <Form.Item label="Description" name="description">
                  <Input.TextArea
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    placeholder="Node description..."
                    onFocus={() => {
                      inspectorEditingRef.current = true;
                    }}
                    onBlur={commitInspectorHistoryIfEnded}
                  />
                </Form.Item>
                <Form.Item
                  label={
                    <div className="bp-inspector-section-header">
                      <span>Inputs</span>
                      <Button className="bp-collapse-btn" size="small" onClick={() => toggleInspectorPins("inputs")}>
                        {collapsedInspectorPins.inputs ? "Expand" : "Collapse"}
                      </Button>
                    </div>
                  }
                >
                  {!collapsedInspectorPins.inputs ? (
                    <div className="bp-pin-grid">
                      <div className="bp-pin-grid-head">Name</div>
                      <div className="bp-pin-grid-head">Type</div>
                      <div className="bp-pin-grid-head">Default Value</div>
                      {selectedNode.inputs.length === 0 ? (
                        <Typography.Text type="secondary">No input pins.</Typography.Text>
                      ) : (
                        selectedNode.inputs.map((pin) => (
                          <React.Fragment key={`${selectedNode.id}-inspector-input-${pin.name}`}>
                            <Input value={pin.name} readOnly />
                            <Input value={pin.type} readOnly />
                            {renderDefaultValueEditor(selectedNode.id, pin)}
                          </React.Fragment>
                        ))
                      )}
                    </div>
                  ) : null}
                </Form.Item>
                <Form.Item
                  label={
                    <div className="bp-inspector-section-header">
                      <span>Outputs</span>
                      <Button className="bp-collapse-btn" size="small" onClick={() => toggleInspectorPins("outputs")}>
                        {collapsedInspectorPins.outputs ? "Expand" : "Collapse"}
                      </Button>
                    </div>
                  }
                >
                  {!collapsedInspectorPins.outputs ? (
                    <div className="bp-pin-grid">
                      <div className="bp-pin-grid-head">Name</div>
                      <div className="bp-pin-grid-head">Type</div>
                      <div className="bp-pin-grid-head">Default Value</div>
                      {selectedNode.outputs.length === 0 ? (
                        <Typography.Text type="secondary">No output pins.</Typography.Text>
                      ) : (
                        selectedNode.outputs.map((pin) => (
                          <React.Fragment key={`${selectedNode.id}-inspector-output-${pin.name}`}>
                            <Input value={pin.name} readOnly />
                            <Input value={pin.type} readOnly />
                            {renderDefaultValueEditor(selectedNode.id, pin)}
                          </React.Fragment>
                        ))
                      )}
                    </div>
                  ) : null}
                </Form.Item>
              </Form>
            </div>
          ) : (
            <Typography.Text type="secondary">Select a node to edit its fields.</Typography.Text>
          )}
          <Divider />
          {buildMessage ? (
            <>
              <Typography.Text type="secondary">{buildMessage}</Typography.Text>
              <Divider />
            </>
          ) : null}
          {buildIssues.length > 0 ? (
            <div style={{ maxHeight: 240, overflow: "auto", marginBottom: 12 }}>
              <Typography.Text strong>Build Issues</Typography.Text>
              {buildIssues.slice(0, 20).map((issue, idx) => (
                <button
                  key={`${issue.file}-${issue.edgeId}-${issue.nodeId}-${idx}`}
                  type="button"
                  className="bp-issue-item"
                  onClick={() => focusIssue(issue)}
                >
                  <Tag color={issue.level === "error" ? "error" : "warning"}>{issue.level}</Tag>
                  <Typography.Text type="secondary">{issue.message}</Typography.Text>
                </button>
              ))}
            </div>
          ) : null}
          <Typography.Text type="secondary">
            Graph: {doc.graph.nodes.length} nodes / {doc.graph.edges.length} edges
          </Typography.Text>
        </div>
        <div
          className={`bp-canvas ${pan ? "bp-canvas-panning" : "bp-canvas-idle"} ${drag ? "bp-canvas-dragging" : ""
            }`}
          ref={canvasRef}
          onMouseDown={(e) => {
            if (drag || marquee) {
              return;
            }
            const target = e.target as HTMLElement;
            if (
              target.classList.contains("bp-canvas") ||
              target.classList.contains("bp-edges")
            ) {
              if (e.altKey || e.button === 1) {
                setNodeContextMenu(null);
                setPan({
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  startX: viewport.x,
                  startY: viewport.y,
                });
              } else if (e.button === 0) {
                setMarquee({
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  currentClientX: e.clientX,
                  currentClientY: e.clientY,
                });
                setSelectedNodeIds([]);
                setSelectedNodeId(null);
                setNodeContextMenu(null);
              }
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            const target = e.target as HTMLElement | null;
            if (!target?.closest(".bp-node-context-menu")) {
              setNodeContextMenu(null);
            }
          }}
          onMouseMove={(e) => {
            if (!pending) {
              return;
            }
            setPendingCursor({ clientX: e.clientX, clientY: e.clientY });
          }}
          onWheel={(e) => {
            e.preventDefault();
            if (!canvasRef.current) {
              return;
            }
            const rect = canvasRef.current.getBoundingClientRect();
            const localX = e.clientX - rect.left;
            const localY = e.clientY - rect.top;
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            const nextScale = clamp(viewport.scale * zoomFactor, 0.4, 2.5);
            const worldX = (localX - viewport.x) / viewport.scale;
            const worldY = (localY - viewport.y) / viewport.scale;
            const nextX = localX - worldX * nextScale;
            const nextY = localY - worldY * nextScale;
            setViewport({ x: nextX, y: nextY, scale: nextScale });
          }}
        >
          <svg className="bp-edges">
            {doc.graph.edges.map((e) => {
              const d = edgePath(e);
              if (!d) {
                return null;
              }
              const edgeClassName = `bp-edge ${issueEdgeIds.has(e.id) ? "bp-edge-issue" : ""} ${focusedEdgeId === e.id ? "bp-edge-focused" : ""
                } ${selectedEdgeId === e.id ? "bp-edge-selected" : ""} ${selectedEdgeId && selectedEdgeId !== e.id ? "bp-edge-muted" : ""
                }`;
              return (
                <g key={e.id}>
                  <path
                    d={d}
                    className="bp-edge-hit"
                    onClick={(evt) => {
                      evt.stopPropagation();
                      setSelectedEdgeId(e.id);
                      setSelectedNodeId(null);
                      setSelectedNodeIds([]);
                      setPending(null);
                      setConnectionHint(null);
                    }}
                  />
                  <path d={d} className={edgeClassName} />
                </g>
              );
            })}
            {pendingEdgePath ? <path d={pendingEdgePath} className="bp-edge bp-edge-pending" /> : null}
          </svg>
          {doc.graph.nodes.map((node) => (
            <Card
              key={node.id}
              size="small"
              className={`bp-node ${nodeTreeState.rootId === node.id ? "bp-node-root" : ""
                } ${nodeTreeState.legalNodes.has(node.id) && nodeTreeState.rootId !== node.id ? "bp-node-legal" : ""
                } ${nodeTreeState.illegalNodes.has(node.id) ? "bp-node-illegal" : ""
                } ${selectedNodeId === node.id || selectedNodeIds.includes(node.id) ? "bp-node-selected" : ""
                } ${selectedNodeId === node.id ? "bp-node-selected-primary" : ""
                } ${issueNodeIds.has(node.id) ? "bp-node-issue" : ""
                } ${drag?.nodeIds.includes(node.id) ? "bp-node-dragging" : ""
                }`}
              style={{
                left: node.x * viewport.scale + viewport.x,
                top: node.y * viewport.scale + viewport.y,
                width: nodeWidth,
                transform: `scale(${viewport.scale})`,
                transformOrigin: "top left",
              }}
              title={
                <div className="bp-node-title-row">
                  <span className="bp-node-title-text">{node.title}</span>
                  <span className="bp-node-title-index">{nodeTreeState.numberById.get(node.id) ?? "-"}</span>
                </div>
              }
              onMouseDown={(e) => {
                if (e.button !== 0) {
                  return;
                }
                e.stopPropagation();
                setNodeContextMenu(null);
                const target = e.target;
                if (target instanceof Element && target.closest(".bp-pin")) {
                  return;
                }
                const toggle = e.ctrlKey || e.metaKey;
                let effectiveSelection: string[] = [];
                if (toggle) {
                  const exists = selectedNodeIds.includes(node.id);
                  effectiveSelection = exists
                    ? selectedNodeIds.filter((id) => id !== node.id)
                    : [...selectedNodeIds, node.id];
                  setSelectedNodeIds(effectiveSelection);
                  setSelectedNodeId(effectiveSelection[0] ?? null);
                } else {
                  if (selectedNodeIds.includes(node.id) && selectedNodeIds.length > 1) {
                    effectiveSelection = selectedNodeIds;
                  } else {
                    effectiveSelection = [node.id];
                    setSelectedNodeIds(effectiveSelection);
                    setSelectedNodeId(node.id);
                  }
                }
                if (effectiveSelection.length === 0) {
                  setDrag(null);
                  return;
                }
                const world = clientToWorld(e.clientX, e.clientY);
                const startNodePositions: Record<string, { x: number; y: number }> = {};
                for (const id of effectiveSelection) {
                  const nodeAtStart = selectedLookup.get(id);
                  if (nodeAtStart) {
                    startNodePositions[id] = { x: nodeAtStart.x, y: nodeAtStart.y };
                  }
                }
                setDrag({
                  nodeIds: effectiveSelection,
                  startPointerWorldX: world.x,
                  startPointerWorldY: world.y,
                  startNodePositions,
                });
                dragMovedRef.current = false;
                if (isDragDebugEnabled()) {
                  console.debug("[bp-drag] start", {
                    target: getTargetDebugName(e.target),
                    selectedNodeIds: effectiveSelection,
                    startPointerWorldX: world.x,
                    startPointerWorldY: world.y,
                    startNodePositions,
                  });
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!canvasRef.current) {
                  return;
                }
                const rect = canvasRef.current.getBoundingClientRect();
                setSelectedNodeId(node.id);
                setSelectedNodeIds([node.id]);
                setSelectedEdgeId(null);
                setNodeContextMenu({
                  nodeId: node.id,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }}
            >
              <div className="bp-node-content">
                {node.description?.trim() ? (
                  <div className="bp-node-description" title={node.description}>
                    {node.description}
                  </div>
                ) : null}
                <div className="bp-node-pins">
                  <div className="bp-pin-column">
                    {node.inputs.map((pin) => (
                      <button
                        key={`${node.id}-in-${pin.name}`}
                        className={`bp-pin bp-pin-input ${invalidPinFlash?.direction === "input" &&
                          invalidPinFlash.nodeId === node.id &&
                          invalidPinFlash.pinName === pin.name
                          ? "bp-pin-invalid"
                          : hoveredInputPin?.nodeId === node.id && hoveredInputPin.pinName === pin.name
                            ? hoveredInputPin.canConnect
                              ? "bp-pin-connectable"
                              : "bp-pin-unconnectable"
                            : ""
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInputPinClick(node.id, pin.name);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onMouseEnter={() => {
                          if (!pending) {
                            return;
                          }
                          const reason = validateConnection(doc, pending, node.id, pin.name);
                          setHoveredInputPin({
                            nodeId: node.id,
                            pinName: pin.name,
                            canConnect: !reason,
                          });
                        }}
                        onMouseLeave={() => {
                          setHoveredInputPin((prev) =>
                            prev && prev.nodeId === node.id && prev.pinName === pin.name ? null : prev
                          );
                        }}
                      >
                        {pin.name}
                      </button>
                    ))}
                  </div>
                  <div className="bp-pin-column bp-pin-column-right">
                    {node.outputs.map((pin) => (
                      <button
                        key={`${node.id}-out-${pin.name}`}
                        className="bp-pin bp-pin-output"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOutputPinClick(node.id, pin.name, {
                            clientX: e.clientX,
                            clientY: e.clientY,
                          });
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        {pin.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {marquee && canvasRef.current ? (
            <div
              className="bp-marquee"
              style={{
                left: Math.min(marquee.startClientX, marquee.currentClientX) - canvasRef.current.getBoundingClientRect().left,
                top: Math.min(marquee.startClientY, marquee.currentClientY) - canvasRef.current.getBoundingClientRect().top,
                width: Math.abs(marquee.currentClientX - marquee.startClientX),
                height: Math.abs(marquee.currentClientY - marquee.startClientY),
              }}
            />
          ) : null}
          {nodeContextMenu ? (
            <div
              className="bp-node-context-menu"
              style={{ left: nodeContextMenu.x, top: nodeContextMenu.y }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="bp-node-context-menu-item"
                disabled={!nodeTreeState.canSetAsRoot.has(nodeContextMenu.nodeId)}
                onClick={() => onSetRootNode(nodeContextMenu.nodeId)}
              >
                Set As Root Node
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </App>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <EditorApp />
  </React.StrictMode>
);
