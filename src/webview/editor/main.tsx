import { App, Button, Card, Divider, Form, Input, InputNumber, Modal, Select, Space, Switch, Tag, Typography } from "antd";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  type BlueprintDocument,
  type BlueprintDispatcher,
  type BlueprintEdge,
  type BlueprintGraphBody,
  type BlueprintNode,
  type BlueprintPin as Pin,
  type EditTarget,
  blueprintPinsEqual,
  collectLifecycleHookNamesFromGraph,
  createDefaultBlueprintDocument,
  findEventStartNodeIdForLifecycleHook,
  createNewFunctionGraphBody,
  getGraphBody,
  mapDocAtTarget,
  mergeEventStartPinsForLifecycle,
  NODE_VALUE_LIFECYCLE_HOOK,
  parseBlueprintDocumentJson,
  createNewDispatcherGraphBody,
  findDispatcherEntryNode,
  getDispatcherPayloadOutputsForDoc,
  getGlobalEventPayloadPinsForChannel,
  getInvokePinsForFunctionDoc,
  mergeBroadcastDispatcherInputs,
  mergeGlobalEventListenOutputs,
  NODE_VALUE_DISPATCHER_ID,
  NODE_VALUE_FUNCTION_ID,
  NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID,
  renameDispatcherIdInDocument,
  stripBroadcastReferencesToDispatcher,
  stripInvokeReferencesToFunction,
  TEMPLATE_BIND_DISPATCHER_LISTENER,
  TEMPLATE_BROADCAST_DISPATCHER,
  TEMPLATE_CLEAR_DISPATCHER_LISTENERS,
  TEMPLATE_DISPATCHER_ENTRY,
  TEMPLATE_EVENT_START,
  TEMPLATE_FUNCTION_ENTRY,
  TEMPLATE_FUNCTION_RETURN,
  TEMPLATE_INVOKE_FUNCTION,
} from "../../shared/blueprint/documentModel";
import type { BaseClassDef, GlobalEventChannelDef } from "../../shared/blueprint-config";
import { validateConnectionHintKey } from "./graph-validation";
import { computeNodeTreeState } from "./graph-tree-state";
import { MyBlueprintPanel } from "./my-blueprint-panel";
import { resolveUiLocale, translateUiText, type UiTextKey } from "./ui-text";
import * as vscodeApi from "./vscodeApi";
import {
  IconAlignBottom,
  IconAlignLeft,
  IconAlignRight,
  IconAlignTop,
  IconAutoLayout,
  IconBuild,
  IconDeleteEdge,
  IconDeleteNode,
  IconDistributeH,
  IconDistributeV,
  IconFocusNode,
  IconLegend,
  IconRedo,
  IconReloadDefs,
  IconResetView,
  IconUndo,
} from "./canvas-toolbar-icons";
import "./style.scss";

type BuildIssue = {
  file: string;
  message: string;
  level: "error" | "warning";
  nodeId?: string;
  nodeIds?: string[];
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

const UI_LOCALE = resolveUiLocale();

/** Stable empty list so `useMemo` / `useEffect` deps do not churn on “no hooks”. */
const STABLE_EMPTY_LIFECYCLE: readonly string[] = [];

const tr = (
  key: UiTextKey,
  params?: Record<string, string | number>
): string => {
  return translateUiText(key, UI_LOCALE, params);
};

/** Maps used to resolve canvas subtitle + layout (card head height). */
type NodeLayoutMaps = {
  functionById: ReadonlyMap<string, BlueprintGraphBody>;
  dispatcherById: ReadonlyMap<string, BlueprintDispatcher>;
  globalEventEmitTemplate: string;
  globalEventListenTemplate: string;
};

type CanvasTargetSubtitle = { text: string; title?: string };

function computeCanvasTargetSubtitle(node: BlueprintNode, maps: NodeLayoutMaps): CanvasTargetSubtitle | null {
  const emitName = maps.globalEventEmitTemplate.trim();
  const listenName = maps.globalEventListenTemplate.trim();
  const { functionById, dispatcherById } = maps;

  if (node.template === TEMPLATE_INVOKE_FUNCTION) {
    const fid = (node.values?.[NODE_VALUE_FUNCTION_ID] ?? "").trim();
    if (!fid) {
      return { text: tr("invokeNodeCanvasNoFunction"), title: undefined };
    }
    const f = functionById.get(fid);
    const text = (f?.name?.trim() || f?.id || fid).trim() || fid;
    return { text, title: fid };
  }

  if (node.template === TEMPLATE_BROADCAST_DISPATCHER) {
    const did = (node.values?.[NODE_VALUE_DISPATCHER_ID] ?? "").trim();
    if (!did) {
      return { text: tr("broadcastDispatcherNodeCanvasNoDispatcher"), title: undefined };
    }
    const d = dispatcherById.get(did);
    const text = (d?.name?.trim() || d?.id || did).trim() || did;
    return { text, title: did };
  }

  if (node.template === TEMPLATE_BIND_DISPATCHER_LISTENER) {
    const did = (node.values?.[NODE_VALUE_DISPATCHER_ID] ?? "").trim();
    const fid = (node.values?.[NODE_VALUE_FUNCTION_ID] ?? "").trim();
    const dRec = did ? dispatcherById.get(did) : undefined;
    const fRec = fid ? functionById.get(fid) : undefined;
    const dLabel = did ? (dRec?.name?.trim() || dRec?.id || did).trim() || did : "";
    const fLabel = fid ? (fRec?.name?.trim() || fRec?.id || fid).trim() || fid : "";
    if (!dLabel && !fLabel) {
      return { text: tr("bindDispatcherNodeCanvasNoTarget"), title: undefined };
    }
    const text = dLabel && fLabel ? `${dLabel} → ${fLabel}` : dLabel || fLabel;
    const titleParts: string[] = [];
    if (did) {
      titleParts.push(`dispatcher: ${did}`);
    }
    if (fid) {
      titleParts.push(`function: ${fid}`);
    }
    return { text, title: titleParts.join(" · ") || undefined };
  }

  if (node.template === TEMPLATE_CLEAR_DISPATCHER_LISTENERS) {
    const did = (node.values?.[NODE_VALUE_DISPATCHER_ID] ?? "").trim();
    if (!did) {
      return { text: tr("clearDispatcherNodeCanvasNoDispatcher"), title: undefined };
    }
    const d = dispatcherById.get(did);
    const text = (d?.name?.trim() || d?.id || did).trim() || did;
    return { text, title: did };
  }

  if (emitName && node.template === emitName) {
    const cid = (node.values?.[NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID] ?? "").trim();
    if (!cid) {
      return { text: tr("globalEventNodeCanvasNoChannel"), title: undefined };
    }
    return { text: cid, title: cid };
  }

  if (listenName && node.template === listenName) {
    const cid = (node.values?.[NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID] ?? "").trim();
    if (!cid) {
      return { text: tr("globalEventNodeCanvasNoChannel"), title: undefined };
    }
    return { text: cid, title: cid };
  }

  return null;
}

const createDefaultDocument = (): BlueprintDocument => createDefaultBlueprintDocument();
const parseDocument = (content: string): BlueprintDocument => parseBlueprintDocumentJson(content);

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
const DRAG_DEBUG_KEY = "bp.dragDebug";
/** `application/json` drag payload: `{ kind: "invoke-function", functionId: string }`. */
const BP_DND_KIND_INVOKE_FUNCTION = "invoke-function";

/** Match `.bp-node` border, `.ant-card-head { min-height: 34px }`, subtitle row, `.ant-card-body` padding, optional description, `.bp-pin-column` row spacing (see `style.scss`). */
const NODE_BORDER_TOP_PX = 1;
const CARD_HEAD_SINGLE_LINE_PX = 34;
/** Extra head height when `computeCanvasTargetSubtitle` is non-null: `.bp-node-title-stack` gap (1) + `.bp-node-title-target` line (14). */
const CARD_HEAD_SUBTITLE_EXTRA_PX = 15;
const CARD_BODY_PAD_TOP_PX = 8;
const NODE_CONTENT_GAP_PX = 8;
const DESC_LINE_PX = Math.ceil(11 * 1.4);
/** Vertical distance between pin centers (gap 6px + ~18px row in `.bp-pin-column`). */
const PIN_CENTER_STEP_PX = 24;
/** Center of first pin row from the top of `.bp-node-pins` (~half of `.bp-pin` row height). */
const FIRST_PIN_CENTER_FROM_PINS_TOP_PX = 8;

const getCardHeadHeightForLayout = (node: BlueprintNode, layoutMaps?: NodeLayoutMaps): number => {
  if (!layoutMaps) {
    return CARD_HEAD_SINGLE_LINE_PX;
  }
  return computeCanvasTargetSubtitle(node, layoutMaps)
    ? CARD_HEAD_SINGLE_LINE_PX + CARD_HEAD_SUBTITLE_EXTRA_PX
    : CARD_HEAD_SINGLE_LINE_PX;
};

/** Y offset from node top (unscaled, same space as `node.y`) to the vertical center of pin at `pinIndex` in its column. */
const getPinCenterYOffsetFromNodeTop = (
  node: BlueprintNode,
  pinIndex: number,
  layoutMaps?: NodeLayoutMaps
): number => {
  let o = NODE_BORDER_TOP_PX + getCardHeadHeightForLayout(node, layoutMaps) + CARD_BODY_PAD_TOP_PX;
  if (node.description?.trim()) {
    o += DESC_LINE_PX + NODE_CONTENT_GAP_PX;
  }
  o += FIRST_PIN_CENTER_FROM_PINS_TOP_PX + pinIndex * PIN_CENTER_STEP_PX;
  return o;
};

const getNodeHeight = (node: BlueprintNode, layoutMaps?: NodeLayoutMaps) => {
  const n = Math.max(node.inputs.length, node.outputs.length);
  let h =
    NODE_BORDER_TOP_PX +
    getCardHeadHeightForLayout(node, layoutMaps) +
    CARD_BODY_PAD_TOP_PX +
    (node.description?.trim() ? DESC_LINE_PX + NODE_CONTENT_GAP_PX : 0);
  if (n > 0) {
    h +=
      FIRST_PIN_CENTER_FROM_PINS_TOP_PX +
      (n - 1) * PIN_CENTER_STEP_PX +
      PIN_CENTER_STEP_PX / 2;
  }
  h += 10 + 1;
  return h;
};
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const PIN_ANCHOR_OFFSET = 6;
const getPinHoverTitle = (pin: Pin): string => `${pin.name} (${pin.type})`;

type PinTypeTooltipState = { text: string; left: number; top: number };
const getPinTypeClassName = (type: string): string => {
  const t = type.trim().toLowerCase();
  if (!t) return "bp-pin-type-unknown";
  return `bp-pin-type-${t.replace(/[^a-z0-9_-]/g, "-")}`;
};
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
  const nodeSizeY = getNodeHeight({
    id: "_layout",
    title: "",
    x: 0,
    y: 0,
    inputs: Array.from({ length: 4 }, (_, i) => ({ name: `i${i}`, type: "x" })),
    outputs: [{ name: "o", type: "x" }],
  });

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

const validateConnection = (
  graph: BlueprintGraphBody,
  pending: PendingConnection,
  toNodeId: string,
  toPinName: string
): string | null => {
  const hintKey = validateConnectionHintKey(graph, pending, toNodeId, toPinName);
  if (!hintKey) {
    return null;
  }
  if (hintKey === "connectionPinTypeMismatch") {
    const fromNode = graph.nodes.find((n) => n.id === pending.fromNodeId);
    const toNode = graph.nodes.find((n) => n.id === toNodeId);
    const outPin = findOutputPin(fromNode, pending.fromPin);
    const inPin = findInputPin(toNode, toPinName);
    return tr(hintKey, {
      from: outPin?.type ?? "?",
      to: inPin?.type ?? "?",
    });
  }
  if (hintKey === "connectionExecInputAlreadyConnected") {
    return tr(hintKey, { nodeId: toNodeId, pinName: toPinName });
  }
  return tr(hintKey);
};

const EditorApp = () => {
  const [ready, setReady] = useState(false);
  const [doc, setDoc] = useState<BlueprintDocument>(createDefaultDocument());
  const latestDocRef = useRef(doc);
  latestDocRef.current = doc;
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
  const [canvasContextMenu, setCanvasContextMenu] = useState<{
    x: number;
    y: number;
    worldX: number;
    worldY: number;
  } | null>(null);
  /** Filter text for "add node from template" context menu */
  const [addNodeTemplateQuery, setAddNodeTemplateQuery] = useState("");
  const addNodeMenuSearchRef = useRef<React.ComponentRef<typeof Input> | null>(null);
  const dismissContextMenus = () => {
    setCanvasContextMenu(null);
  };
  const [form] = Form.useForm<{ description: string }>();
  const [variableForm] = Form.useForm<{ name: string; type: string }>();
  const [historyState, setHistoryState] = useState({ index: -1, length: 0 });
  const [collapsedInspectorPins, setCollapsedInspectorPins] = useState({
    inputs: false,
    outputs: false,
  });
  const [showLegend, setShowLegend] = useState(true);
  const [pinTypeTooltip, setPinTypeTooltip] = useState<PinTypeTooltipState | null>(null);
  const [selectedVariableIndex, setSelectedVariableIndex] = useState<number | null>(null);
  const [graphExplorerActive, setGraphExplorerActive] = useState(true);
  const [baseClasses, setBaseClasses] = useState<BaseClassDef[]>([]);
  const [globalEventChannels, setGlobalEventChannels] = useState<GlobalEventChannelDef[]>([]);
  const [globalEventEmitTemplate, setGlobalEventEmitTemplate] = useState("");
  const [globalEventListenTemplate, setGlobalEventListenTemplate] = useState("");
  const [selectedLifecycleEvent, setSelectedLifecycleEvent] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>({ kind: "main" });
  const [functionRenameModal, setFunctionRenameModal] = useState<{ id: string } | null>(null);
  const [functionRenameDraft, setFunctionRenameDraft] = useState("");
  const [dispatcherRenameModal, setDispatcherRenameModal] = useState<{ id: string } | null>(null);
  const [dispatcherRenameDraft, setDispatcherRenameDraft] = useState("");
  const [dispatcherRenameIdDraft, setDispatcherRenameIdDraft] = useState("");
  const [inheritsSelectOpen, setInheritsSelectOpen] = useState(false);

  const activeGraph = useMemo(() => getGraphBody(doc, editTarget), [doc, editTarget]);
  const functionGraphList = useMemo(
    () => doc.functions.map((f) => ({ id: f.id, name: f.name })),
    [doc.functions]
  );
  const functionById = useMemo(
    () => new Map(doc.functions.map((f) => [f.id, f] as const)),
    [doc.functions]
  );
  const dispatcherById = useMemo(
    () => new Map(doc.dispatchers.map((d) => [d.id, d] as const)),
    [doc.dispatchers]
  );
  const dispatcherGraphList = useMemo(
    () => doc.dispatchers.map((d) => ({ id: d.id, name: d.name })),
    [doc.dispatchers]
  );

  const nodeLayoutMaps = useMemo<NodeLayoutMaps>(
    () => ({
      functionById,
      dispatcherById,
      globalEventEmitTemplate,
      globalEventListenTemplate,
    }),
    [functionById, dispatcherById, globalEventEmitTemplate, globalEventListenTemplate]
  );

  /** Second line under node title: selected function, dispatcher, global channel, etc. */
  const getNodeCanvasTargetSubtitle = useCallback(
    (node: BlueprintNode) => computeCanvasTargetSubtitle(node, nodeLayoutMaps),
    [nodeLayoutMaps]
  );

  const editingContextLabel = useMemo(() => {
    if (editTarget.kind === "main") {
      return tr("canvasEditingMainGraph");
    }
    if (editTarget.kind === "function") {
      const f = doc.functions.find((x) => x.id === editTarget.id);
      return f?.name ?? editTarget.id;
    }
    const d = doc.dispatchers.find((x) => x.id === editTarget.id);
    return d?.name ?? editTarget.id;
  }, [editTarget, doc.functions, doc.dispatchers]);
  const configLifecycleHooks = useMemo((): readonly string[] => {
    const name = doc.inherits?.trim();
    if (!name) {
      return STABLE_EMPTY_LIFECYCLE;
    }
    const bc = baseClasses.find((b) => b.name === name);
    if (!bc?.lifecycle?.length) {
      return STABLE_EMPTY_LIFECYCLE;
    }
    return bc.lifecycle.map((h) => h.name);
  }, [doc.inherits, baseClasses]);

  const graphLifecycleHooks = useMemo(
    () => collectLifecycleHookNamesFromGraph(doc.graph),
    [doc.graph]
  );

  /** Hooks that already have an Event.Start on the main graph (left list). */
  const displayedLifecycleHooks = useMemo(() => {
    const hooks = [...graphLifecycleHooks];
    const order = new Map(configLifecycleHooks.map((h, i) => [h, i] as const));
    return hooks.sort((a, b) => {
      const oa = order.get(a);
      const ob = order.get(b);
      if (oa !== undefined && ob !== undefined) {
        return oa - ob;
      }
      if (oa !== undefined) {
        return -1;
      }
      if (ob !== undefined) {
        return 1;
      }
      return a.localeCompare(b);
    });
  }, [graphLifecycleHooks, configLifecycleHooks]);

  /** Config hooks not yet added to the main graph (+ menu). */
  const lifecycleHooksAvailableToAdd = useMemo(() => {
    const onGraph = new Set(graphLifecycleHooks);
    return configLifecycleHooks.filter((h) => !onGraph.has(h));
  }, [graphLifecycleHooks, configLifecycleHooks]);

  const addLifecyclePlusTitle = useMemo(() => {
    if (lifecycleHooksAvailableToAdd.length > 0) {
      return tr("myBlueprintAddLifecycleTooltip");
    }
    const inh = doc.inherits?.trim();
    if (!inh) {
      return tr("myBlueprintAddLifecycleNeedBase");
    }
    if (!baseClasses.some((b) => b.name === inh)) {
      return tr("myBlueprintLifecycleUnknownBase", { name: inh });
    }
    const bc = baseClasses.find((b) => b.name === inh);
    if (!bc?.lifecycle?.length) {
      return tr("myBlueprintLifecycleNoHooks", { name: inh });
    }
    return tr("myBlueprintLifecycleAllAdded");
  }, [lifecycleHooksAvailableToAdd.length, doc.inherits, baseClasses]);

  const lifecycleEmptyHint = useMemo(() => {
    if (displayedLifecycleHooks.length > 0) {
      return null;
    }
    const inh = doc.inherits?.trim();
    if (!inh) {
      return tr("myBlueprintLifecyclePickBase");
    }
    if (!baseClasses.some((b) => b.name === inh)) {
      return tr("myBlueprintLifecycleUnknownBase", { name: inh });
    }
    const bc = baseClasses.find((b) => b.name === inh);
    if (bc?.lifecycle?.length) {
      return tr("myBlueprintLifecycleUsePlusToAdd");
    }
    return tr("myBlueprintLifecycleNoHooks", { name: inh });
  }, [displayedLifecycleHooks.length, doc.inherits, baseClasses]);

  /** Keep Event.Start pins in sync with blueprint.config.json lifecycle `outputs` (inputs follow Event.Start template only). */
  useEffect(() => {
    const inh = doc.inherits?.trim();
    if (!inh) {
      return;
    }
    const bc = baseClasses.find((b) => b.name === inh);
    if (!bc?.lifecycle.length) {
      return;
    }
    const template = nodeDefs.find((d) => d.name === TEMPLATE_EVENT_START);
    const tmplIn = template?.inputs ?? [];
    const tmplOut =
      template?.outputs && template.outputs.length > 0
        ? template.outputs
        : [{ name: "exec", type: "exec" }];
    const hookByName = new Map(bc.lifecycle.map((h) => [h.name, h] as const));

    skipPushHistoryRef.current = true;
    setDoc((prev) => {
      let changed = false;
      const nextNodes = prev.graph.nodes.map((n) => {
        if (n.template !== TEMPLATE_EVENT_START) {
          return n;
        }
        const hookName = (n.values?.[NODE_VALUE_LIFECYCLE_HOOK] ?? "").trim();
        if (!hookName) {
          return n;
        }
        const hookDef = hookByName.get(hookName);
        if (!hookDef) {
          return n;
        }
        const { inputs, outputs } = mergeEventStartPinsForLifecycle(tmplIn, tmplOut, hookDef);
        if (blueprintPinsEqual(n.inputs, inputs) && blueprintPinsEqual(n.outputs, outputs)) {
          return n;
        }
        changed = true;
        return { ...n, inputs, outputs };
      });
      if (!changed) {
        return prev;
      }
      return { ...prev, graph: { ...prev.graph, nodes: nextNodes } };
    });
  }, [baseClasses, nodeDefs, doc.inherits, doc.graph]);

  /** Sync BroadcastDispatcher input pins from selected dispatcher's DispatcherEntry payload outputs. */
  useEffect(() => {
    const template = nodeDefs.find((d) => d.name === TEMPLATE_BROADCAST_DISPATCHER);
    const tmplIn = template?.inputs ?? [{ name: "exec", type: "exec" }];
    skipPushHistoryRef.current = true;
    setDoc((prev) => {
      const syncGraph = (g: BlueprintGraphBody): { next: BlueprintGraphBody; changed: boolean } => {
        let changed = false;
        const nodes = g.nodes.map((n) => {
          if (n.template !== TEMPLATE_BROADCAST_DISPATCHER) {
            return n;
          }
          const did = (n.values?.[NODE_VALUE_DISPATCHER_ID] ?? "").trim();
          const payload = did ? getDispatcherPayloadOutputsForDoc(prev, did) : [];
          const inputs = mergeBroadcastDispatcherInputs(tmplIn, payload);
          if (blueprintPinsEqual(n.inputs, inputs)) {
            return n;
          }
          changed = true;
          return { ...n, inputs };
        });
        return changed ? { next: { ...g, nodes }, changed: true } : { next: g, changed: false };
      };
      const mainRes = syncGraph(prev.graph);
      let any = mainRes.changed;
      const nextFns = prev.functions.map((f) => {
        const r = syncGraph(f);
        if (r.changed) {
          any = true;
        }
        return r.next;
      });
      if (!any) {
        return prev;
      }
      return { ...prev, graph: mainRes.next, functions: nextFns };
    });
  }, [nodeDefs, doc.graph, doc.functions, doc.dispatchers]);

  /** Sync `Flow.InvokeFunction` data pins from each target function's Entry outputs / Return inputs. */
  useEffect(() => {
    const template = nodeDefs.find((d) => d.name === TEMPLATE_INVOKE_FUNCTION);
    if (!template) {
      return;
    }
    const tmplIn = template.inputs ?? [{ name: "exec", type: "exec" }];
    const tmplOut = template.outputs ?? [{ name: "exec", type: "exec" }];
    skipPushHistoryRef.current = true;
    setDoc((prev) => {
      const syncGraph = (g: BlueprintGraphBody): { next: BlueprintGraphBody; changed: boolean } => {
        let changed = false;
        const nodes = g.nodes.map((n) => {
          if (n.template !== TEMPLATE_INVOKE_FUNCTION) {
            return n;
          }
          const fid = (n.values?.[NODE_VALUE_FUNCTION_ID] ?? "").trim();
          const { inputs: pinIn, outputs: pinOut } = getInvokePinsForFunctionDoc(prev, fid);
          const inputs = mergeBroadcastDispatcherInputs(tmplIn, pinIn);
          const outputs = mergeBroadcastDispatcherInputs(tmplOut, pinOut);
          if (blueprintPinsEqual(n.inputs, inputs) && blueprintPinsEqual(n.outputs, outputs)) {
            return n;
          }
          changed = true;
          return { ...n, inputs, outputs };
        });
        return changed ? { next: { ...g, nodes }, changed: true } : { next: g, changed: false };
      };
      const mainRes = syncGraph(prev.graph);
      let any = mainRes.changed;
      const nextFns = prev.functions.map((f) => {
        const r = syncGraph(f);
        if (r.changed) {
          any = true;
        }
        return r.next;
      });
      const nextDisp = prev.dispatchers.map((d) => {
        const r = syncGraph(d.graph);
        if (r.changed) {
          any = true;
        }
        return { ...d, graph: r.next };
      });
      if (!any) {
        return prev;
      }
      return { ...prev, graph: mainRes.next, functions: nextFns, dispatchers: nextDisp };
    });
  }, [nodeDefs, doc.graph, doc.functions, doc.dispatchers]);

  /** Sync global event Emit/Listen pins from blueprint.config.json `globalEventChannels`. */
  useEffect(() => {
    const emitName = globalEventEmitTemplate.trim();
    const listenName = globalEventListenTemplate.trim();
    if (!emitName && !listenName) {
      return;
    }
    const emitDef = nodeDefs.find((d) => d.name === emitName);
    const listenDef = nodeDefs.find((d) => d.name === listenName);
    skipPushHistoryRef.current = true;
    setDoc((prev) => {
      const syncGraph = (g: BlueprintGraphBody, includeListen: boolean): { next: BlueprintGraphBody; changed: boolean } => {
        let changed = false;
        const nodes = g.nodes.map((n) => {
          let nextNode = n;
          if (emitName && nextNode.template === emitName) {
            const cid = (nextNode.values?.[NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID] ?? "").trim();
            const payload = cid ? getGlobalEventPayloadPinsForChannel(globalEventChannels, cid) : [];
            const tmplIn = emitDef?.inputs ?? [{ name: "exec", type: "exec" }];
            const inputs = mergeBroadcastDispatcherInputs(tmplIn, payload);
            if (!blueprintPinsEqual(nextNode.inputs, inputs)) {
              changed = true;
              nextNode = { ...nextNode, inputs };
            }
          }
          if (includeListen && listenName && nextNode.template === listenName) {
            const cid = (nextNode.values?.[NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID] ?? "").trim();
            const payload = cid ? getGlobalEventPayloadPinsForChannel(globalEventChannels, cid) : [];
            const tmplOut = listenDef?.outputs ?? [{ name: "exec", type: "exec" }];
            const outputs = mergeGlobalEventListenOutputs(tmplOut, payload);
            if (!blueprintPinsEqual(nextNode.outputs, outputs)) {
              changed = true;
              nextNode = { ...nextNode, outputs };
            }
          }
          return nextNode;
        });
        return changed ? { next: { ...g, nodes }, changed: true } : { next: g, changed: false };
      };
      const mainRes = syncGraph(prev.graph, true);
      let any = mainRes.changed;
      const nextFns = prev.functions.map((f) => {
        const r = syncGraph(f, false);
        if (r.changed) {
          any = true;
        }
        return r.next;
      });
      if (!any) {
        return prev;
      }
      return { ...prev, graph: mainRes.next, functions: nextFns };
    });
  }, [
    nodeDefs,
    globalEventChannels,
    globalEventEmitTemplate,
    globalEventListenTemplate,
    doc.graph,
    doc.functions,
  ]);

  useEffect(() => {
    if (editTarget.kind === "function" || editTarget.kind === "dispatcher") {
      setInheritsSelectOpen(false);
    }
  }, [editTarget.kind]);

  const handleInheritsDropdownVisibleChange = useCallback(
    (nextOpen: boolean) => {
      if (editTarget.kind === "function" || editTarget.kind === "dispatcher") {
        return;
      }
      if (!nextOpen) {
        setInheritsSelectOpen(false);
        return;
      }
      const cur = doc.inherits?.trim();
      if (!cur) {
        setInheritsSelectOpen(true);
        return;
      }
      Modal.confirm({
        title: tr("inheritsChangeWarnTitle"),
        content: tr("inheritsChangeWarnBody", { current: cur }),
        okText: tr("inheritsChangeConfirm"),
        cancelText: tr("functionCancel"),
        onOk: () => {
          setInheritsSelectOpen(true);
        },
      });
      setInheritsSelectOpen(false);
    },
    [doc.inherits, editTarget.kind]
  );

  const subgraphOpen = editTarget.kind === "function" || editTarget.kind === "dispatcher";

  const handleInheritsSelectChange = useCallback(
    (v: unknown) => {
      const next = v != null && v !== "" ? String(v) : undefined;
      const had = doc.inherits?.trim();
      if (had && next === undefined) {
        Modal.confirm({
          title: tr("inheritsClearWarnTitle"),
          content: tr("inheritsClearWarnBody", { current: had }),
          okText: tr("inheritsClearConfirm"),
          cancelText: tr("functionCancel"),
          onOk: () => {
            setDoc((prev) => ({ ...prev, inherits: undefined }));
            setInheritsSelectOpen(false);
          },
        });
        return;
      }
      setDoc((prev) => ({ ...prev, inherits: next }));
      setInheritsSelectOpen(false);
    },
    [doc.inherits]
  );

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
  const nodeFinderRef = useRef<React.ComponentRef<typeof Select> | null>(null);
  const inspectorEditingRef = useRef(false);
  const inspectorFormSyncRef = useRef<{
    id: string;
    description: string;
  } | null>(null);
  const editTargetRef = useRef<EditTarget>({ kind: "main" });

  useEffect(() => {
    editTargetRef.current = editTarget;
  }, [editTarget]);

  useEffect(() => {
    if (editTarget.kind === "function" && !doc.functions.some((f) => f.id === editTarget.id)) {
      setEditTarget({ kind: "main" });
    }
  }, [doc.functions, editTarget.kind, editTarget.id]);

  useEffect(() => {
    if (editTarget.kind === "dispatcher" && !doc.dispatchers.some((d) => d.id === editTarget.id)) {
      setEditTarget({ kind: "main" });
    }
  }, [doc.dispatchers, editTarget.kind, editTarget.id]);

  /**
   * Screen-space pin anchors from layout + viewport. Used for edge SVG paths so curves stay in sync
   * while panning/zooming (DOM getBoundingClientRect during render lags one frame behind viewport).
   */
  const getPinAnchorFromGeometry = (
    node: BlueprintNode,
    direction: "input" | "output",
    pinName: string
  ): { x: number; y: number } => {
    const pins = direction === "input" ? node.inputs : node.outputs;
    const idx = Math.max(0, pins.findIndex((p) => p.name === pinName));
    const yWorld = node.y + getPinCenterYOffsetFromNodeTop(node, idx, nodeLayoutMaps);
    const s = viewport.scale;
    const ox = viewport.x;
    const oy = viewport.y;
    if (direction === "input") {
      return {
        x: node.x * s + ox + PIN_ANCHOR_OFFSET,
        y: yWorld * s + oy,
      };
    }
    return {
      x: (node.x + nodeWidth) * s + ox - PIN_ANCHOR_OFFSET,
      y: yWorld * s + oy,
    };
  };

  const updatePinTypeTooltip = (pin: Pin, e: React.MouseEvent) => {
    if (!canvasRef.current) {
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    setPinTypeTooltip({
      text: getPinHoverTitle(pin),
      left: e.clientX - rect.left + 10,
      top: e.clientY - rect.top - 28,
    });
  };

  const selectedNode = useMemo(
    () => activeGraph.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [activeGraph.nodes, selectedNodeId]
  );

  const isDispatcherEntrySignatureEdit =
    editTarget.kind === "dispatcher" && selectedNode?.template === TEMPLATE_DISPATCHER_ENTRY;
  const isFunctionEntrySignatureEdit =
    editTarget.kind === "function" && selectedNode?.template === TEMPLATE_FUNCTION_ENTRY;
  const isFunctionReturnSignatureEdit =
    editTarget.kind === "function" && selectedNode?.template === TEMPLATE_FUNCTION_RETURN;

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
    for (const n of activeGraph.nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [activeGraph.nodes]);
  const edgeLookup = useMemo(() => {
    const map = new Map<string, BlueprintEdge>();
    for (const e of activeGraph.edges) {
      map.set(e.id, e);
    }
    return map;
  }, [activeGraph.edges]);

  const selectedVariable = useMemo(() => {
    if (selectedVariableIndex === null) {
      return null;
    }
    return activeGraph.variables[selectedVariableIndex] ?? null;
  }, [activeGraph.variables, selectedVariableIndex]);

  useEffect(() => {
    setSelectedVariableIndex(null);
  }, [editTarget]);

  useEffect(() => {
    setSelectedLifecycleEvent((cur) => {
      if (cur && displayedLifecycleHooks.includes(cur)) {
        return cur;
      }
      return displayedLifecycleHooks[0] ?? null;
    });
  }, [displayedLifecycleHooks]);

  useEffect(() => {
    if (selectedNodeId !== null) {
      setGraphExplorerActive(true);
      setSelectedVariableIndex(null);
    }
  }, [selectedNodeId]);

  const onBackToEventGraph = useCallback(() => {
    setEditTarget({ kind: "main" });
    setGraphExplorerActive(true);
    setSelectedVariableIndex(null);
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
  }, []);

  const onExplorerSelectLifecycleHook = useCallback((hook: string) => {
    onBackToEventGraph();
    setSelectedLifecycleEvent(hook);
  }, [onBackToEventGraph]);

  const onExplorerSelectFunctionId = useCallback((functionId: string) => {
    setEditTarget({ kind: "function", id: functionId });
    setGraphExplorerActive(true);
    setSelectedVariableIndex(null);
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
  }, []);

  const onExplorerAddFunction = useCallback(() => {
    const id = `fn_${Math.random().toString(36).slice(2, 9)}`;
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setGraphExplorerActive(true);
    setSelectedVariableIndex(null);
    setDoc((prev) => {
      let name = "NewFunction";
      let n = 0;
      while (prev.functions.some((f) => f.name === name)) {
        n += 1;
        name = `NewFunction_${n}`;
      }
      const body = createNewFunctionGraphBody(id, name);
      return {
        ...prev,
        functions: [...prev.functions, body],
      };
    });
    setEditTarget({ kind: "function", id });
  }, []);

  const onExplorerRenameFunction = useCallback((functionId: string) => {
    const f = doc.functions.find((x) => x.id === functionId);
    setFunctionRenameDraft(f?.name ?? "");
    setFunctionRenameModal({ id: functionId });
  }, [doc.functions]);

  const applyFunctionRename = useCallback(() => {
    if (!functionRenameModal) {
      return;
    }
    const name = functionRenameDraft.trim() || "Unnamed";
    setDoc((prev) => ({
      ...prev,
      functions: prev.functions.map((f) => (f.id === functionRenameModal.id ? { ...f, name } : f)),
    }));
    setFunctionRenameModal(null);
  }, [functionRenameDraft, functionRenameModal]);

  const onExplorerDeleteFunction = useCallback(
    (functionId: string) => {
      const f = doc.functions.find((x) => x.id === functionId);
      Modal.confirm({
        title: tr("functionDeleteConfirmTitle"),
        content: tr("functionDeleteConfirmContent", { name: f?.name ?? functionId }),
        okType: "danger",
        okText: tr("functionDeleteOk"),
        cancelText: tr("functionCancel"),
        onOk: () => {
          setDoc((prev) => {
            const stripped = stripInvokeReferencesToFunction(prev, functionId);
            return { ...stripped, functions: stripped.functions.filter((x) => x.id !== functionId) };
          });
          setEditTarget((cur) => (cur.kind === "function" && cur.id === functionId ? { kind: "main" } : cur));
        },
      });
    },
    [doc.functions]
  );

  const onExplorerSelectDispatcherId = useCallback((dispatcherId: string) => {
    setEditTarget({ kind: "dispatcher", id: dispatcherId });
    setGraphExplorerActive(true);
    setSelectedVariableIndex(null);
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
  }, []);

  const onExplorerAddDispatcher = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setGraphExplorerActive(true);
    setSelectedVariableIndex(null);
    let createdId = "";
    setDoc((prev) => {
      let id = `disp_${Math.random().toString(36).slice(2, 9)}`;
      let tries = 0;
      while (
        (prev.functions.some((f) => f.id === id) || prev.dispatchers.some((d) => d.id === id)) &&
        tries < 8
      ) {
        id = `disp_${Math.random().toString(36).slice(2, 9)}`;
        tries += 1;
      }
      let name = "NewDispatcher";
      let n = 0;
      while (prev.dispatchers.some((d) => d.name === name)) {
        n += 1;
        name = `NewDispatcher_${n}`;
      }
      createdId = id;
      const graph = createNewDispatcherGraphBody(id, name);
      return {
        ...prev,
        dispatchers: [...prev.dispatchers, { id, name, graph }],
      };
    });
    setEditTarget({ kind: "dispatcher", id: createdId });
  }, []);

  const onExplorerRenameDispatcher = useCallback(
    (dispatcherId: string) => {
      const d = doc.dispatchers.find((x) => x.id === dispatcherId);
      setDispatcherRenameDraft(d?.name ?? "");
      setDispatcherRenameIdDraft(d?.id ?? dispatcherId);
      setDispatcherRenameModal({ id: dispatcherId });
    },
    [doc.dispatchers]
  );

  const applyDispatcherRename = useCallback(() => {
    if (!dispatcherRenameModal) {
      return;
    }
    const name = dispatcherRenameDraft.trim() || "Unnamed";
    const newIdRaw = dispatcherRenameIdDraft.trim();
    const oldId = dispatcherRenameModal.id;
    setDoc((prev) => {
      if (!newIdRaw || newIdRaw === oldId) {
        queueMicrotask(() => {
          setDispatcherRenameModal(null);
        });
        return {
          ...prev,
          dispatchers: prev.dispatchers.map((d) =>
            d.id === oldId ? { ...d, name, graph: { ...d.graph, name } } : d
          ),
        };
      }
      const renamed = renameDispatcherIdInDocument(prev, oldId, newIdRaw);
      if (!renamed) {
        queueMicrotask(() => {
          void Modal.error({
            title: tr("dispatcherRenameIdConflictTitle"),
            content: tr("dispatcherRenameIdConflictBody"),
          });
        });
        return prev;
      }
      queueMicrotask(() => {
        setDispatcherRenameModal(null);
        setEditTarget((cur) =>
          cur.kind === "dispatcher" && cur.id === oldId ? { kind: "dispatcher", id: newIdRaw } : cur
        );
      });
      return {
        ...renamed,
        dispatchers: renamed.dispatchers.map((d) =>
          d.id === newIdRaw ? { ...d, name, graph: { ...d.graph, name } } : d
        ),
      };
    });
  }, [dispatcherRenameDraft, dispatcherRenameIdDraft, dispatcherRenameModal, tr]);

  const onExplorerDeleteDispatcher = useCallback(
    (dispatcherId: string) => {
      const d = doc.dispatchers.find((x) => x.id === dispatcherId);
      Modal.confirm({
        title: tr("dispatcherDeleteConfirmTitle"),
        content: tr("dispatcherDeleteConfirmContent", { name: d?.name ?? dispatcherId }),
        okType: "danger",
        okText: tr("dispatcherDeleteOk"),
        cancelText: tr("functionCancel"),
        onOk: () => {
          setDoc((prev) => {
            const stripped = stripBroadcastReferencesToDispatcher(prev, dispatcherId);
            return {
              ...stripped,
              dispatchers: stripped.dispatchers.filter((x) => x.id !== dispatcherId),
            };
          });
          setEditTarget((cur) =>
            cur.kind === "dispatcher" && cur.id === dispatcherId ? { kind: "main" } : cur
          );
        },
      });
    },
    [doc.dispatchers]
  );

  const onExplorerSelectVariable = useCallback((index: number) => {
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setGraphExplorerActive(false);
    setSelectedVariableIndex(index);
  }, []);

  const onExplorerAddVariable = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setGraphExplorerActive(false);
    setDoc((prev) => {
      const t = editTargetRef.current;
      let newIndex = 0;
      const next = mapDocAtTarget(prev, t, (g) => {
        const vars = [...g.variables];
        let name = "newVar";
        let n = 0;
        while (vars.some((x) => x.name === name)) {
          n += 1;
          name = `newVar${n}`;
        }
        vars.push({ name, type: "string" });
        newIndex = vars.length - 1;
        return { ...g, variables: vars };
      });
      queueMicrotask(() => {
        setSelectedVariableIndex(newIndex);
      });
      return next;
    });
  }, []);

  const onExplorerRemoveVariable = useCallback((index: number) => {
    setDoc((prev) =>
      mapDocAtTarget(prev, editTargetRef.current, (g) => ({
        ...g,
        variables: g.variables.filter((_, i) => i !== index),
      }))
    );
    setSelectedVariableIndex((cur) => {
      if (cur === null) {
        return null;
      }
      if (cur === index) {
        return null;
      }
      if (cur > index) {
        return cur - 1;
      }
      return cur;
    });
    setGraphExplorerActive(true);
  }, []);
  const graphTreeGlobalEvent = useMemo(() => {
    const t = globalEventListenTemplate.trim();
    if (!t) {
      return null;
    }
    return {
      listenTemplate: t,
      allowedChannelIds: globalEventChannels.map((c) => c.id),
    };
  }, [globalEventListenTemplate, globalEventChannels]);

  const nodeTreeState = useMemo(() => {
    const mode =
      editTarget.kind === "main" ? "main" : editTarget.kind === "function" ? "function" : "dispatcher";
    return computeNodeTreeState(
      activeGraph.nodes,
      activeGraph.edges,
      mode,
      configLifecycleHooks,
      graphTreeGlobalEvent
    );
  }, [activeGraph.nodes, activeGraph.edges, editTarget.kind, configLifecycleHooks, graphTreeGlobalEvent]);
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
    const onMainGraph = editTarget.kind === "main";
    const onFunctionGraph = editTarget.kind === "function";
    const onDispatcherGraph = editTarget.kind === "dispatcher";
    for (const def of nodeDefs) {
      if (def.name === TEMPLATE_FUNCTION_ENTRY || def.name === TEMPLATE_FUNCTION_RETURN) {
        if (!onFunctionGraph) {
          continue;
        }
      }
      if (def.name === TEMPLATE_INVOKE_FUNCTION) {
        if (!onMainGraph && !onFunctionGraph) {
          continue;
        }
      }
      if (def.name === TEMPLATE_DISPATCHER_ENTRY) {
        if (!onDispatcherGraph) {
          continue;
        }
      }
      if (def.name === TEMPLATE_BROADCAST_DISPATCHER) {
        if (!onMainGraph && !onFunctionGraph) {
          continue;
        }
      }
      if (def.name === TEMPLATE_BIND_DISPATCHER_LISTENER || def.name === TEMPLATE_CLEAR_DISPATCHER_LISTENERS) {
        if (!onMainGraph && !onFunctionGraph) {
          continue;
        }
      }
      const emitTpl = globalEventEmitTemplate.trim();
      const listenTpl = globalEventListenTemplate.trim();
      if (emitTpl && def.name === emitTpl) {
        if (!onMainGraph && !onFunctionGraph) {
          continue;
        }
      }
      if (listenTpl && def.name === listenTpl) {
        if (!onMainGraph) {
          continue;
        }
      }
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
  }, [nodeDefs, editTarget.kind, globalEventEmitTemplate, globalEventListenTemplate]);

  const filteredTemplateMenuGroups = useMemo(() => {
    const q = addNodeTemplateQuery.trim().toLowerCase();
    if (!q) {
      return templateOptions;
    }
    return templateOptions
      .map((group) => ({
        label: group.label,
        options: group.options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(q) ||
            opt.value.toLowerCase().includes(q) ||
            group.label.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.options.length > 0);
  }, [templateOptions, addNodeTemplateQuery]);

  const nodeSearchOptions = useMemo(
    () =>
      activeGraph.nodes
        .map((n) => ({
          value: n.id,
          label: `${n.title || n.id} (${n.id})`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [activeGraph.nodes]
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
    if (findNodeId && !activeGraph.nodes.some((n) => n.id === findNodeId)) {
      setFindNodeId("");
    }
  }, [activeGraph.nodes, findNodeId]);

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
        setSelectedVariableIndex(null);
        setEditTarget({ kind: "main" });
        setGraphExplorerActive(true);
        const defs = (msg.nodeDefs ?? []).map(normalizeNodeDef).filter((v): v is NodeDef => !!v);
        setNodeDefs(defs);
        setBaseClasses(msg.baseClasses ?? []);
        setGlobalEventChannels(msg.globalEventChannels ?? []);
        setGlobalEventEmitTemplate(msg.globalEventEmitTemplate ?? "");
        setGlobalEventListenTemplate(msg.globalEventListenTemplate ?? "");
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
        setSelectedVariableIndex(null);
        setEditTarget({ kind: "main" });
        setGraphExplorerActive(true);
      } else if (msg.type === "buildResult") {
        setBuildMessage(msg.message);
        setBuildIssues(msg.issues ?? []);
      } else if (msg.type === "settingLoaded") {
        const defs = (msg.nodeDefs ?? []).map(normalizeNodeDef).filter((v): v is NodeDef => !!v);
        setNodeDefs(defs);
        setBaseClasses(msg.baseClasses ?? []);
        setGlobalEventChannels(msg.globalEventChannels ?? []);
        setGlobalEventEmitTemplate(msg.globalEventEmitTemplate ?? "");
        setGlobalEventListenTemplate(msg.globalEventListenTemplate ?? "");
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
      setDoc((prev) =>
        mapDocAtTarget(prev, editTargetRef.current, (g) => ({
          ...g,
          nodes: g.nodes.map((n) =>
            drag.nodeIds.includes(n.id)
              ? {
                ...n,
                x: Math.max(16, (drag.startNodePositions[n.id]?.x ?? n.x) + dx),
                y: Math.max(16, (drag.startNodePositions[n.id]?.y ?? n.y) + dy),
              }
              : n
          ),
        }))
      );
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
    setDoc((prev) =>
      mapDocAtTarget(prev, editTargetRef.current, (g) => ({
        ...g,
        nodes: g.nodes.map((n) => {
          const start = drag.startNodePositions[n.id];
          return start ? { ...n, x: start.x, y: start.y } : n;
        }),
      }))
    );
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
      const hits = activeGraph.nodes
        .filter((node) => {
          const left = node.x * viewport.scale + viewport.x;
          const top = node.y * viewport.scale + viewport.y;
          const width = nodeWidth * viewport.scale;
          const height = getNodeHeight(node, nodeLayoutMaps) * viewport.scale;
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
  }, [marquee, activeGraph.nodes, viewport.scale, viewport.x, viewport.y, nodeLayoutMaps]);

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
    if (!canvasContextMenu) {
      return;
    }
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(".bp-canvas-context-menu")) {
        return;
      }
      dismissContextMenus();
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [canvasContextMenu]);

  useEffect(() => {
    if (!canvasContextMenu) {
      return;
    }
    setAddNodeTemplateQuery("");
    const id = window.requestAnimationFrame(() => {
      addNodeMenuSearchRef.current?.focus?.();
    });
    return () => window.cancelAnimationFrame(id);
  }, [canvasContextMenu]);

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

  const addNodeFromTemplate = (templateName: string, worldPos?: { x: number; y: number }) => {
    const template = nodeDefs.find((d) => d.name === templateName);
    if (!template) {
      return;
    }
    const id = `node_${Math.random().toString(36).slice(2, 8)}`;
    const inputs = template.inputs ?? [{ name: "in", type: "exec" }];
    const outputs = template.outputs ?? [{ name: "out", type: "exec" }];
    setDoc((prev) =>
      mapDocAtTarget(prev, editTargetRef.current, (g) => {
        const x = worldPos?.x ?? 160 + g.nodes.length * 24;
        const y = worldPos?.y ?? 160 + g.nodes.length * 16;
        return {
          ...g,
          nodes: [
            ...g.nodes,
            {
              id,
              title: template.title || template.name || "New Node",
              template: template.name,
              description: template.desc ?? "",
              x,
              y,
              inputs,
              outputs,
              values: template.defaults
                ? Object.fromEntries(
                  Object.entries(template.defaults).map(([k, v]) => [k, String(v)])
                )
                : undefined,
            },
          ],
        };
      })
    );
    setSelectedNodeId(id);
    setSelectedNodeIds([id]);
    dismissContextMenus();
  };

  const addInvokeFunctionNodeAtWorld = useCallback(
    (functionId: string, worldPos: { x: number; y: number }) => {
      const template = nodeDefs.find((d) => d.name === TEMPLATE_INVOKE_FUNCTION);
      if (!template) {
        return;
      }
      const fid = functionId.trim();
      if (!fid) {
        return;
      }
      const id = `node_${Math.random().toString(36).slice(2, 8)}`;
      setDoc((prev) => {
        const tmplIn = template.inputs ?? [{ name: "exec", type: "exec" }];
        const tmplOut = template.outputs ?? [{ name: "exec", type: "exec" }];
        const { inputs: pinIn, outputs: pinOut } = getInvokePinsForFunctionDoc(prev, fid);
        const inputs = mergeBroadcastDispatcherInputs(tmplIn, pinIn);
        const outputs = mergeBroadcastDispatcherInputs(tmplOut, pinOut);
        const baseValues = template.defaults
          ? Object.fromEntries(Object.entries(template.defaults).map(([k, v]) => [k, String(v)]))
          : {};
        return mapDocAtTarget(prev, editTargetRef.current, (g) => ({
          ...g,
          nodes: [
            ...g.nodes,
            {
              id,
              title: template.title || template.name || "Invoke Function",
              template: template.name,
              description: template.desc ?? "",
              x: Math.max(16, worldPos.x),
              y: Math.max(16, worldPos.y),
              inputs,
              outputs,
              values: { ...baseValues, [NODE_VALUE_FUNCTION_ID]: fid },
            },
          ],
        }));
      });
      setSelectedNodeId(id);
      setSelectedNodeIds([id]);
      dismissContextMenus();
    },
    [nodeDefs]
  );

  const onDeleteNode = () => {
    const targets = selectedNodeIds.length > 0 ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : [];
    if (targets.length === 0) {
      return;
    }
    setDoc((prev) =>
      mapDocAtTarget(prev, editTargetRef.current, (g) => ({
        ...g,
        nodes: g.nodes.filter((n) => !targets.includes(n.id)),
        edges: g.edges.filter(
          (e) => !targets.includes(e.fromNodeId) && !targets.includes(e.toNodeId)
        ),
      }))
    );
    setSelectedNodeIds([]);
    setSelectedNodeId(null);
    dismissContextMenus();
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
    setSelectedVariableIndex(null);
    setEditTarget({ kind: "main" });
    setGraphExplorerActive(true);
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
    setSelectedVariableIndex(null);
    setEditTarget({ kind: "main" });
    setGraphExplorerActive(true);
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
      const g = getGraphBody(prev, editTargetRef.current);
      const selected = g.nodes.filter((n) => targets.includes(n.id));
      if (selected.length < 2) {
        return prev;
      }
      const xs = selected.map((n) => n.x);
      const ys = selected.map((n) => n.y);
      const left = Math.min(...xs);
      const right = Math.max(...xs);
      const top = Math.min(...ys);
      const bottom = Math.max(...ys);
      const xMap = new Map<string, number>();
      const yMap = new Map<string, number>();
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
      return mapDocAtTarget(prev, editTargetRef.current, (g2) => ({
        ...g2,
        nodes: g2.nodes.map((n) =>
          targets.includes(n.id)
            ? {
              ...n,
              x: xMap.has(n.id) ? xMap.get(n.id)! : n.x,
              y: yMap.has(n.id) ? yMap.get(n.id)! : n.y,
            }
            : n
        ),
      }));
    });
  };
  const onAutoLayout = () => {
    setDoc((prev) =>
      mapDocAtTarget(prev, editTargetRef.current, (g) => ({
        ...g,
        nodes: autoLayoutNodes(g.nodes, g.edges),
      }))
    );
    setConnectionHint(null);
    setPending(null);
    dismissContextMenus();
  };
  const toggleInspectorPins = (key: "inputs" | "outputs") => {
    setCollapsedInspectorPins((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addDispatcherEntryPayloadOutput = useCallback(() => {
    const nodeId = selectedNodeId;
    if (!nodeId || editTargetRef.current.kind !== "dispatcher") {
      return;
    }
    skipPushHistoryRef.current = true;
    const suf = Math.random().toString(36).slice(2, 6);
    const newName = `payload_${suf}`;
    setDoc((prev) =>
      mapDocAtTarget(prev, editTargetRef.current, (g) => ({
        ...g,
        nodes: g.nodes.map((n) => {
          if (n.id !== nodeId) {
            return n;
          }
          const outputs = [...(n.outputs ?? [])];
          outputs.push({ name: newName, type: "number" });
          return { ...n, outputs };
        }),
      }))
    );
  }, [selectedNodeId]);

  const removeDispatcherEntryPayloadOutput = useCallback(
    (pinName: string) => {
      const nodeId = selectedNodeId;
      if (!nodeId || editTargetRef.current.kind !== "dispatcher") {
        return;
      }
      skipPushHistoryRef.current = true;
      setDoc((prev) =>
        mapDocAtTarget(prev, editTargetRef.current, (g) => ({
          ...g,
          edges: g.edges.filter(
            (e) =>
              !(
                (e.fromNodeId === nodeId && e.fromPin === pinName) ||
                (e.toNodeId === nodeId && e.toPin === pinName)
              )
          ),
          nodes: g.nodes.map((n) => {
            if (n.id !== nodeId) {
              return n;
            }
            return {
              ...n,
              outputs: (n.outputs ?? []).filter((p) => !(p.name === pinName && p.type !== "exec")),
            };
          }),
        }))
      );
    },
    [selectedNodeId]
  );

  const setDispatcherEntryPayloadPinField = useCallback(
    (fromPinName: string, field: "name" | "type", raw: string) => {
      const nodeId = selectedNodeId;
      if (!nodeId || editTargetRef.current.kind !== "dispatcher") {
        return;
      }
      const trimmed = raw.trim();
      if (field === "name" && (!trimmed || trimmed === fromPinName)) {
        return;
      }
      if (field === "type" && !trimmed) {
        return;
      }
      skipPushHistoryRef.current = true;
      setDoc((prev) =>
        mapDocAtTarget(prev, editTargetRef.current, (g) => {
          const n = g.nodes.find((x) => x.id === nodeId);
          if (!n) {
            return g;
          }
          const nextName = field === "name" ? trimmed : fromPinName;
          if (field === "name") {
            const clash = (n.outputs ?? []).some((p) => p.name === nextName && p.name !== fromPinName);
            if (clash) {
              return g;
            }
          }
          let nextEdges = g.edges;
          if (field === "name") {
            nextEdges = g.edges.map((e) => {
              if (e.fromNodeId === nodeId && e.fromPin === fromPinName) {
                return { ...e, fromPin: nextName };
              }
              if (e.toNodeId === nodeId && e.toPin === fromPinName) {
                return { ...e, toPin: nextName };
              }
              return e;
            });
          }
          return {
            ...g,
            edges: nextEdges,
            nodes: g.nodes.map((node) => {
              if (node.id !== nodeId) {
                return node;
              }
              return {
                ...node,
                outputs: (node.outputs ?? []).map((p) => {
                  if (p.type === "exec" || p.name !== fromPinName) {
                    return p;
                  }
                  return field === "name" ? { ...p, name: nextName } : { ...p, type: trimmed };
                }),
              };
            }),
          };
        })
      );
    },
    [selectedNodeId]
  );

  const addFunctionEntryPayloadOutput = useCallback(() => {
    const nodeId = selectedNodeId;
    if (!nodeId || editTargetRef.current.kind !== "function") {
      return;
    }
    skipPushHistoryRef.current = true;
    const suf = Math.random().toString(36).slice(2, 6);
    const newName = `param_${suf}`;
    setDoc((prev) =>
      mapDocAtTarget(prev, editTargetRef.current, (g) => ({
        ...g,
        nodes: g.nodes.map((n) => {
          if (n.id !== nodeId || n.template !== TEMPLATE_FUNCTION_ENTRY) {
            return n;
          }
          const outputs = [...(n.outputs ?? [])];
          outputs.push({ name: newName, type: "number" });
          return { ...n, outputs };
        }),
      }))
    );
  }, [selectedNodeId]);

  const removeFunctionEntryPayloadOutput = useCallback(
    (pinName: string) => {
      const nodeId = selectedNodeId;
      if (!nodeId || editTargetRef.current.kind !== "function") {
        return;
      }
      skipPushHistoryRef.current = true;
      setDoc((prev) =>
        mapDocAtTarget(prev, editTargetRef.current, (g) => ({
          ...g,
          edges: g.edges.filter(
            (e) =>
              !(
                (e.fromNodeId === nodeId && e.fromPin === pinName) ||
                (e.toNodeId === nodeId && e.toPin === pinName)
              )
          ),
          nodes: g.nodes.map((n) => {
            if (n.id !== nodeId) {
              return n;
            }
            return {
              ...n,
              outputs: (n.outputs ?? []).filter((p) => !(p.name === pinName && p.type !== "exec")),
            };
          }),
        }))
      );
    },
    [selectedNodeId]
  );

  const setFunctionEntryPayloadPinField = useCallback(
    (fromPinName: string, field: "name" | "type", raw: string) => {
      const nodeId = selectedNodeId;
      if (!nodeId || editTargetRef.current.kind !== "function") {
        return;
      }
      const trimmed = raw.trim();
      if (field === "name" && (!trimmed || trimmed === fromPinName)) {
        return;
      }
      if (field === "type" && !trimmed) {
        return;
      }
      skipPushHistoryRef.current = true;
      setDoc((prev) =>
        mapDocAtTarget(prev, editTargetRef.current, (g) => {
          const n = g.nodes.find((x) => x.id === nodeId);
          if (!n) {
            return g;
          }
          const nextName = field === "name" ? trimmed : fromPinName;
          if (field === "name") {
            const clash = (n.outputs ?? []).some((p) => p.name === nextName && p.name !== fromPinName);
            if (clash) {
              return g;
            }
          }
          let nextEdges = g.edges;
          if (field === "name") {
            nextEdges = g.edges.map((e) => {
              if (e.fromNodeId === nodeId && e.fromPin === fromPinName) {
                return { ...e, fromPin: nextName };
              }
              if (e.toNodeId === nodeId && e.toPin === fromPinName) {
                return { ...e, toPin: nextName };
              }
              return e;
            });
          }
          return {
            ...g,
            edges: nextEdges,
            nodes: g.nodes.map((node) => {
              if (node.id !== nodeId) {
                return node;
              }
              return {
                ...node,
                outputs: (node.outputs ?? []).map((p) => {
                  if (p.type === "exec" || p.name !== fromPinName) {
                    return p;
                  }
                  return field === "name" ? { ...p, name: nextName } : { ...p, type: trimmed };
                }),
              };
            }),
          };
        })
      );
    },
    [selectedNodeId]
  );

  const addFunctionReturnPayloadInput = useCallback(() => {
    const nodeId = selectedNodeId;
    if (!nodeId || editTargetRef.current.kind !== "function") {
      return;
    }
    skipPushHistoryRef.current = true;
    const suf = Math.random().toString(36).slice(2, 6);
    const newName = `ret_${suf}`;
    setDoc((prev) =>
      mapDocAtTarget(prev, editTargetRef.current, (g) => ({
        ...g,
        nodes: g.nodes.map((n) => {
          if (n.id !== nodeId || n.template !== TEMPLATE_FUNCTION_RETURN) {
            return n;
          }
          const inputs = [...(n.inputs ?? [])];
          const execIdx = inputs.findIndex((p) => p.type === "exec");
          const insertAt = execIdx >= 0 ? execIdx + 1 : inputs.length;
          inputs.splice(insertAt, 0, { name: newName, type: "number" });
          return { ...n, inputs };
        }),
      }))
    );
  }, [selectedNodeId]);

  const removeFunctionReturnPayloadInput = useCallback(
    (pinName: string) => {
      const nodeId = selectedNodeId;
      if (!nodeId || editTargetRef.current.kind !== "function") {
        return;
      }
      skipPushHistoryRef.current = true;
      setDoc((prev) =>
        mapDocAtTarget(prev, editTargetRef.current, (g) => ({
          ...g,
          edges: g.edges.filter(
            (e) =>
              !(
                (e.fromNodeId === nodeId && e.fromPin === pinName) ||
                (e.toNodeId === nodeId && e.toPin === pinName)
              )
          ),
          nodes: g.nodes.map((n) => {
            if (n.id !== nodeId) {
              return n;
            }
            return {
              ...n,
              inputs: (n.inputs ?? []).filter((p) => !(p.name === pinName && p.type !== "exec")),
            };
          }),
        }))
      );
    },
    [selectedNodeId]
  );

  const setFunctionReturnPayloadInputField = useCallback(
    (fromPinName: string, field: "name" | "type", raw: string) => {
      const nodeId = selectedNodeId;
      if (!nodeId || editTargetRef.current.kind !== "function") {
        return;
      }
      const trimmed = raw.trim();
      if (field === "name" && (!trimmed || trimmed === fromPinName)) {
        return;
      }
      if (field === "type" && !trimmed) {
        return;
      }
      skipPushHistoryRef.current = true;
      setDoc((prev) =>
        mapDocAtTarget(prev, editTargetRef.current, (g) => {
          const n = g.nodes.find((x) => x.id === nodeId);
          if (!n) {
            return g;
          }
          const nextName = field === "name" ? trimmed : fromPinName;
          if (field === "name") {
            const clash = (n.inputs ?? []).some((p) => p.name === nextName && p.name !== fromPinName);
            if (clash) {
              return g;
            }
          }
          let nextEdges = g.edges;
          if (field === "name") {
            nextEdges = g.edges.map((e) => {
              if (e.fromNodeId === nodeId && e.fromPin === fromPinName) {
                return { ...e, fromPin: nextName };
              }
              if (e.toNodeId === nodeId && e.toPin === fromPinName) {
                return { ...e, toPin: nextName };
              }
              return e;
            });
          }
          return {
            ...g,
            edges: nextEdges,
            nodes: g.nodes.map((node) => {
              if (node.id !== nodeId) {
                return node;
              }
              return {
                ...node,
                inputs: (node.inputs ?? []).map((p) => {
                  if (p.type === "exec" || p.name !== fromPinName) {
                    return p;
                  }
                  return field === "name" ? { ...p, name: nextName } : { ...p, type: trimmed };
                }),
              };
            }),
          };
        })
      );
    },
    [selectedNodeId]
  );

  const onOutputPinClick = (nodeId: string, pinName: string, cursor?: PendingCursor) => {
    setConnectionHint(null);
    setPending({ fromNodeId: nodeId, fromPin: pinName });
    if (cursor) {
      setPendingCursor(cursor);
    }
  };

  const commitPendingConnection = (nodeId: string, pinName: string, removeExistingToInput: boolean) => {
    const cur = pending;
    if (!cur) {
      return;
    }
    const edgeId = `${cur.fromNodeId}:${cur.fromPin}->${nodeId}:${pinName}`;
    setDoc((prev) =>
      mapDocAtTarget(prev, editTargetRef.current, (g2) => {
        let nextEdges = g2.edges;
        if (removeExistingToInput) {
          nextEdges = nextEdges.filter((e) => !(e.toNodeId === nodeId && e.toPin === pinName));
        }
        if (nextEdges.some((e) => e.id === edgeId)) {
          return { ...g2, edges: nextEdges };
        }
        return {
          ...g2,
          edges: [
            ...nextEdges,
            {
              id: edgeId,
              fromNodeId: cur.fromNodeId,
              fromPin: cur.fromPin,
              toNodeId: nodeId,
              toPin: pinName,
            },
          ],
        };
      })
    );
    setConnectionHint(null);
    setPending(null);
    setHoveredInputPin(null);
    setSelectedEdgeId(null);
  };

  const onInputPinClick = (nodeId: string, pinName: string) => {
    if (!pending || pending.fromNodeId === nodeId) {
      return;
    }
    const hintKey = validateConnectionHintKey(activeGraph, pending, nodeId, pinName);
    if (hintKey === "connectionExecInputAlreadyConnected") {
      const block = activeGraph.edges.find((e) => e.toNodeId === nodeId && e.toPin === pinName);
      if (!block) {
        return;
      }
      const target = `${nodeId}.${pinName}`;
      const existing = `${block.fromNodeId}.${block.fromPin}`;
      const incoming = `${pending.fromNodeId}.${pending.fromPin}`;
      Modal.confirm({
        title: tr("connectionReplaceIncomingTitle"),
        content: tr("connectionReplaceIncomingBody", { target, existing, incoming }),
        okText: tr("connectionReplaceIncomingOk"),
        cancelText: tr("functionCancel"),
        onOk: () => {
          commitPendingConnection(nodeId, pinName, true);
        },
      });
      return;
    }
    const reason = hintKey ? validateConnection(activeGraph, pending, nodeId, pinName) : null;
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
    commitPendingConnection(nodeId, pinName, false);
  };

  const onDeleteEdge = (edgeId: string) => {
    setDoc((prev) =>
      mapDocAtTarget(prev, editTargetRef.current, (g) => ({
        ...g,
        edges: g.edges.filter((e) => e.id !== edgeId),
      }))
    );
    setConnectionHint(null);
    setPending(null);
    setSelectedEdgeId(null);
    dismissContextMenus();
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
    setDoc((prev) =>
      mapDocAtTarget(prev, editTargetRef.current, (g) => ({
        ...g,
        nodes: g.nodes.map((n) => {
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
      }))
    );
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
  /** Select a single node and pan the viewport so its center is in the canvas view (toolbar “focus” / lifecycle jump / double-click). */
  const selectNodeAndCenterInViewport = useCallback((nodeId: string) => {
    dismissContextMenus();
    const body = getGraphBody(latestDocRef.current, editTargetRef.current);
    const node = body.nodes.find((n) => n.id === nodeId);
    if (!node || !canvasRef.current) {
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const centerWorldX = node.x + nodeWidth / 2;
    const centerWorldY = node.y + getNodeHeight(node, nodeLayoutMaps) / 2;
    setSelectedNodeId(nodeId);
    setSelectedNodeIds([nodeId]);
    setSelectedEdgeId(null);
    setConnectionHint(null);
    setPending(null);
    setHoveredInputPin(null);
    setViewport((prev) => ({
      ...prev,
      x: rect.width / 2 - centerWorldX * prev.scale,
      y: rect.height / 2 - centerWorldY * prev.scale,
    }));
  }, [nodeLayoutMaps]);

  const onExplorerDoubleClickDispatcher = useCallback(
    (dispatcherId: string) => {
      const d = latestDocRef.current.dispatchers.find((x) => x.id === dispatcherId);
      const entry = d ? findDispatcherEntryNode(d.graph) : null;
      setEditTarget({ kind: "dispatcher", id: dispatcherId });
      setGraphExplorerActive(true);
      setSelectedVariableIndex(null);
      setSelectedEdgeId(null);
      window.setTimeout(() => {
        if (entry) {
          selectNodeAndCenterInViewport(entry.id);
        } else {
          setSelectedNodeId(null);
          setSelectedNodeIds([]);
        }
      }, 0);
    },
    [selectNodeAndCenterInViewport]
  );

  const onExplorerDoubleClickLifecycleHook = useCallback(
    (hook: string) => {
      setEditTarget({ kind: "main" });
      setGraphExplorerActive(true);
      setSelectedVariableIndex(null);
      setSelectedLifecycleEvent(hook);
      const id = findEventStartNodeIdForLifecycleHook(latestDocRef.current.graph, hook);
      window.setTimeout(() => {
        if (id) {
          selectNodeAndCenterInViewport(id);
        } else {
          setSelectedNodeId(null);
          setSelectedNodeIds([]);
          setSelectedEdgeId(null);
        }
      }, 0);
    },
    [selectNodeAndCenterInViewport]
  );

  const addLifecycleHookFromConfig = useCallback(
    (hookName: string) => {
      const name = hookName.trim();
      if (!name) {
        return;
      }
      if (!configLifecycleHooks.includes(name)) {
        Modal.warning({
          title: tr("lifecycleAddInvalidTitle"),
          content: tr("lifecycleAddInvalidBody", { name }),
        });
        return;
      }
      const onGraph = collectLifecycleHookNamesFromGraph(latestDocRef.current.graph);
      if (onGraph.includes(name)) {
        Modal.warning({
          title: tr("lifecycleAddDuplicateTitle"),
          content: tr("lifecycleAddDuplicateBody", { name }),
        });
        return;
      }
      setEditTarget({ kind: "main" });
      const template = nodeDefs.find((d) => d.name === TEMPLATE_EVENT_START);
      const tmplIn = template?.inputs ?? [];
      const tmplOut =
        template?.outputs && template.outputs.length > 0
          ? template.outputs
          : [{ name: "exec", type: "exec" }];
      const inh = latestDocRef.current.inherits?.trim();
      const bc = inh ? baseClasses.find((b) => b.name === inh) : undefined;
      const hookDef = bc?.lifecycle.find((h) => h.name === name) ?? { name, outputs: [] };
      const { inputs, outputs } = mergeEventStartPinsForLifecycle(tmplIn, tmplOut, hookDef);
      const id = `node_${Math.random().toString(36).slice(2, 8)}`;
      let y = 120;
      for (const n of latestDocRef.current.graph.nodes) {
        y = Math.max(y, n.y + 140);
      }
      const x = 80;
      setDoc((prev) => ({
        ...prev,
        graph: {
          ...prev.graph,
          nodes: [
            ...prev.graph.nodes,
            {
              id,
              title: name,
              template: TEMPLATE_EVENT_START,
              description: template?.desc ?? "",
              x,
              y,
              inputs,
              outputs,
              values: { [NODE_VALUE_LIFECYCLE_HOOK]: name },
            },
          ],
        },
      }));
      setSelectedLifecycleEvent(name);
      setGraphExplorerActive(true);
      setSelectedVariableIndex(null);
      setSelectedEdgeId(null);
      window.setTimeout(() => selectNodeAndCenterInViewport(id), 0);
    },
    [baseClasses, configLifecycleHooks, nodeDefs, selectNodeAndCenterInViewport]
  );

  const onFocusFoundNode = () => {
    if (!findNodeId) {
      return;
    }
    selectNodeAndCenterInViewport(findNodeId);
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
        const all = activeGraph.nodes.map((n) => n.id);
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
        const selected = activeGraph.nodes.filter((n) => targets.includes(n.id));
        const set = new Set(targets);
        const linked = activeGraph.edges.filter((edge) => set.has(edge.fromNodeId) && set.has(edge.toNodeId));
        clipboardRef.current = {
          nodes: selected.map((n) => JSON.parse(JSON.stringify(n)) as BlueprintNode),
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
          const usedNodeIds = new Set<string>();
          const usedEdgeIds = new Set<string>();
          for (const n of prev.graph.nodes) {
            usedNodeIds.add(n.id);
          }
          for (const edge of prev.graph.edges) {
            usedEdgeIds.add(edge.id);
          }
          for (const fg of prev.functions) {
            for (const n of fg.nodes) {
              usedNodeIds.add(n.id);
            }
            for (const edge of fg.edges) {
              usedEdgeIds.add(edge.id);
            }
          }
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
          return mapDocAtTarget(prev, editTargetRef.current, (g) => ({
            ...g,
            nodes: [...g.nodes, ...newNodes],
            edges: [...g.edges, ...newEdges],
          }));
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
        dismissContextMenus();
        setPinTypeTooltip(null);
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
  }, [doc, activeGraph, selectedNodeId, selectedNodeIds, selectedEdgeId, drag]);

  const focusIssue = (issue: BuildIssue) => {
    let nodeToCenter: BlueprintNode | null = null;
    if (issue.nodeId) {
      setSelectedNodeId(issue.nodeId);
      setSelectedNodeIds([issue.nodeId]);
      nodeToCenter = selectedLookup.get(issue.nodeId) ?? null;
    } else if (issue.nodeIds && issue.nodeIds.length > 0) {
      const first = issue.nodeIds[0];
      setSelectedNodeId(first);
      setSelectedNodeIds([first]);
      nodeToCenter = selectedLookup.get(first) ?? null;
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
      const centerWorldY = nodeToCenter.y + getNodeHeight(nodeToCenter, nodeLayoutMaps) / 2;
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
    const fromPt = getPinAnchorFromGeometry(from, "output", edge.fromPin);
    const toPt = getPinAnchorFromGeometry(to, "input", edge.toPin);
    const x1 = fromPt.x;
    const y1 = fromPt.y;
    const x2 = toPt.x;
    const y2 = toPt.y;
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
    const fromPt = getPinAnchorFromGeometry(from, "output", pending.fromPin);
    const x1 = fromPt.x;
    const y1 = fromPt.y;
    const rect = canvasRef.current.getBoundingClientRect();
    let x2 = pendingCursor.clientX - rect.left;
    let y2 = pendingCursor.clientY - rect.top;
    if (hoveredInputPin) {
      const targetNode = selectedLookup.get(hoveredInputPin.nodeId);
      if (targetNode) {
        const p = getPinAnchorFromGeometry(targetNode, "input", hoveredInputPin.pinName);
        x2 = p.x;
        y2 = p.y;
      }
    }
    const dx = Math.max(80, Math.abs(x2 - x1) * 0.5);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }, [
    pending,
    pendingCursor,
    hoveredInputPin,
    selectedLookup,
    viewport.scale,
    viewport.x,
    viewport.y,
    drag,
    nodeLayoutMaps,
  ]);

  const issueNodeIds = useMemo(() => {
    const set = new Set<string>();
    for (const issue of buildIssues) {
      if (issue.nodeId) {
        set.add(issue.nodeId);
      }
      for (const nodeId of issue.nodeIds ?? []) {
        set.add(nodeId);
      }
    }
    return set;
  }, [buildIssues]);
  const extraRootNodeIds = useMemo(() => {
    const set = new Set<string>();
    for (const issue of buildIssues) {
      if (!issue.nodeIds || issue.nodeIds.length <= 1) {
        continue;
      }
      for (const nodeId of issue.nodeIds.slice(1)) {
        set.add(nodeId);
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
        <MyBlueprintPanel
          lifecycleHooks={[...displayedLifecycleHooks]}
          selectedLifecycleHook={selectedLifecycleEvent}
          lifecycleHooksAvailableToAdd={[...lifecycleHooksAvailableToAdd]}
          onPickLifecycleHookToAdd={addLifecycleHookFromConfig}
          addLifecyclePlusTitle={addLifecyclePlusTitle}
          lifecycleListActive={graphExplorerActive && editTarget.kind === "main"}
          graphExplorerActive={graphExplorerActive}
          lifecycleEmptyHint={lifecycleEmptyHint}
          functionGraphs={functionGraphList}
          activeFunctionId={editTarget.kind === "function" ? editTarget.id : null}
          activeDispatcherId={editTarget.kind === "dispatcher" ? editTarget.id : null}
          onBackToEventGraph={subgraphOpen ? onBackToEventGraph : undefined}
          onSelectFunctionId={onExplorerSelectFunctionId}
          onAddFunction={onExplorerAddFunction}
          dispatcherGraphs={dispatcherGraphList}
          onSelectDispatcherId={onExplorerSelectDispatcherId}
          onAddDispatcher={onExplorerAddDispatcher}
          onRenameDispatcher={onExplorerRenameDispatcher}
          onDeleteDispatcher={onExplorerDeleteDispatcher}
          onDispatcherDoubleClick={onExplorerDoubleClickDispatcher}
          variables={activeGraph.variables}
          selectedVariableIndex={selectedVariableIndex}
          onSelectLifecycleHook={onExplorerSelectLifecycleHook}
          onLifecycleHookDoubleClick={onExplorerDoubleClickLifecycleHook}
          onSelectVariable={onExplorerSelectVariable}
          onAddVariable={onExplorerAddVariable}
          onRemoveVariable={onExplorerRemoveVariable}
          onRenameFunction={onExplorerRenameFunction}
          onDeleteFunction={onExplorerDeleteFunction}
          t={tr}
        />
        <div className="bp-inspector">
          <div className="bp-inspector-version">
            <Typography.Text type="secondary">
              Blueprint Editor {extensionVersion ? `v${extensionVersion}` : ""}
            </Typography.Text>
          </div>
          <Typography.Title level={5}>Inspector</Typography.Title>
          <Divider />
          <div ref={inspectorFormRef}>
            {selectedNode ? (
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
                  setDoc((prev) =>
                    mapDocAtTarget(prev, editTargetRef.current, (g) => ({
                      ...g,
                      nodes: g.nodes.map((n) =>
                        n.id === selectedNode.id
                          ? {
                            ...n,
                            description,
                          }
                          : n
                      ),
                    }))
                  );
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
                {selectedNode.template === TEMPLATE_INVOKE_FUNCTION ? (
                  <Form.Item label={tr("invokeFunctionTargetLabel")}>
                    <Select
                      allowClear
                      placeholder={tr("invokeFunctionTargetPlaceholder")}
                      value={selectedNode.values?.functionId || undefined}
                      options={doc.functions.map((fn) => ({
                        label: `${fn.name} (${fn.id})`,
                        value: fn.id,
                      }))}
                      onChange={(v) => {
                        skipPushHistoryRef.current = true;
                        setDoc((prev) =>
                          mapDocAtTarget(prev, editTargetRef.current, (g) => ({
                            ...g,
                            nodes: g.nodes.map((n) => {
                              if (n.id !== selectedNode.id) {
                                return n;
                              }
                              const values = { ...(n.values ?? {}) };
                              if (v === null || v === undefined || v === "") {
                                delete values.functionId;
                              } else {
                                values.functionId = String(v);
                              }
                              return {
                                ...n,
                                values: Object.keys(values).length > 0 ? values : undefined,
                              };
                            }),
                          }))
                        );
                      }}
                    />
                  </Form.Item>
                ) : null}
                {selectedNode.template === TEMPLATE_BROADCAST_DISPATCHER ? (
                  <Form.Item label={tr("broadcastDispatcherTargetLabel")}>
                    <Select
                      allowClear
                      placeholder={tr("broadcastDispatcherTargetPlaceholder")}
                      value={selectedNode.values?.[NODE_VALUE_DISPATCHER_ID] || undefined}
                      options={doc.dispatchers.map((d) => ({
                        label: `${d.name} (${d.id})`,
                        value: d.id,
                      }))}
                      onChange={(v) => {
                        skipPushHistoryRef.current = true;
                        setDoc((prev) =>
                          mapDocAtTarget(prev, editTargetRef.current, (g) => ({
                            ...g,
                            nodes: g.nodes.map((n) => {
                              if (n.id !== selectedNode.id) {
                                return n;
                              }
                              const values = { ...(n.values ?? {}) };
                              if (v === null || v === undefined || v === "") {
                                delete values[NODE_VALUE_DISPATCHER_ID];
                              } else {
                                values[NODE_VALUE_DISPATCHER_ID] = String(v);
                              }
                              return {
                                ...n,
                                values: Object.keys(values).length > 0 ? values : undefined,
                              };
                            }),
                          }))
                        );
                      }}
                    />
                  </Form.Item>
                ) : null}
                {selectedNode.template === TEMPLATE_BIND_DISPATCHER_LISTENER ? (
                  <>
                    <Form.Item label={tr("broadcastDispatcherTargetLabel")}>
                      <Select
                        allowClear
                        placeholder={tr("broadcastDispatcherTargetPlaceholder")}
                        value={selectedNode.values?.[NODE_VALUE_DISPATCHER_ID] || undefined}
                        options={doc.dispatchers.map((d) => ({
                          label: `${d.name} (${d.id})`,
                          value: d.id,
                        }))}
                        onChange={(v) => {
                          skipPushHistoryRef.current = true;
                          setDoc((prev) =>
                            mapDocAtTarget(prev, editTargetRef.current, (g) => ({
                              ...g,
                              nodes: g.nodes.map((n) => {
                                if (n.id !== selectedNode.id) {
                                  return n;
                                }
                                const values = { ...(n.values ?? {}) };
                                if (v === null || v === undefined || v === "") {
                                  delete values[NODE_VALUE_DISPATCHER_ID];
                                } else {
                                  values[NODE_VALUE_DISPATCHER_ID] = String(v);
                                }
                                return {
                                  ...n,
                                  values: Object.keys(values).length > 0 ? values : undefined,
                                };
                              }),
                            }))
                          );
                        }}
                      />
                    </Form.Item>
                    <Form.Item label={tr("invokeFunctionTargetLabel")}>
                      <Select
                        allowClear
                        placeholder={tr("invokeFunctionTargetPlaceholder")}
                        value={selectedNode.values?.[NODE_VALUE_FUNCTION_ID] || undefined}
                        options={doc.functions.map((fn) => ({
                          label: `${fn.name} (${fn.id})`,
                          value: fn.id,
                        }))}
                        onChange={(v) => {
                          skipPushHistoryRef.current = true;
                          setDoc((prev) =>
                            mapDocAtTarget(prev, editTargetRef.current, (g) => ({
                              ...g,
                              nodes: g.nodes.map((n) => {
                                if (n.id !== selectedNode.id) {
                                  return n;
                                }
                                const values = { ...(n.values ?? {}) };
                                if (v === null || v === undefined || v === "") {
                                  delete values[NODE_VALUE_FUNCTION_ID];
                                } else {
                                  values[NODE_VALUE_FUNCTION_ID] = String(v);
                                }
                                return {
                                  ...n,
                                  values: Object.keys(values).length > 0 ? values : undefined,
                                };
                              }),
                            }))
                          );
                        }}
                      />
                    </Form.Item>
                  </>
                ) : null}
                {selectedNode.template === TEMPLATE_CLEAR_DISPATCHER_LISTENERS ? (
                  <Form.Item label={tr("broadcastDispatcherTargetLabel")}>
                    <Select
                      allowClear
                      placeholder={tr("broadcastDispatcherTargetPlaceholder")}
                      value={selectedNode.values?.[NODE_VALUE_DISPATCHER_ID] || undefined}
                      options={doc.dispatchers.map((d) => ({
                        label: `${d.name} (${d.id})`,
                        value: d.id,
                      }))}
                      onChange={(v) => {
                        skipPushHistoryRef.current = true;
                        setDoc((prev) =>
                          mapDocAtTarget(prev, editTargetRef.current, (g) => ({
                            ...g,
                            nodes: g.nodes.map((n) => {
                              if (n.id !== selectedNode.id) {
                                return n;
                              }
                              const values = { ...(n.values ?? {}) };
                              if (v === null || v === undefined || v === "") {
                                delete values[NODE_VALUE_DISPATCHER_ID];
                              } else {
                                values[NODE_VALUE_DISPATCHER_ID] = String(v);
                              }
                              return {
                                ...n,
                                values: Object.keys(values).length > 0 ? values : undefined,
                              };
                            }),
                          }))
                        );
                      }}
                    />
                  </Form.Item>
                ) : null}
                {((globalEventEmitTemplate.trim() &&
                  selectedNode.template === globalEventEmitTemplate.trim()) ||
                  (globalEventListenTemplate.trim() &&
                    selectedNode.template === globalEventListenTemplate.trim())) ? (
                  <Form.Item label={tr("globalEventChannelLabel")}>
                    <Select
                      allowClear
                      placeholder={tr("globalEventChannelPlaceholder")}
                      value={selectedNode.values?.[NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID] || undefined}
                      options={globalEventChannels.map((c) => ({ label: c.id, value: c.id }))}
                      onChange={(v) => {
                        skipPushHistoryRef.current = true;
                        setDoc((prev) =>
                          mapDocAtTarget(prev, editTargetRef.current, (g) => ({
                            ...g,
                            nodes: g.nodes.map((n) => {
                              if (n.id !== selectedNode.id) {
                                return n;
                              }
                              const values = { ...(n.values ?? {}) };
                              if (v === null || v === undefined || v === "") {
                                delete values[NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID];
                              } else {
                                values[NODE_VALUE_GLOBAL_EVENT_CHANNEL_ID] = String(v);
                              }
                              return {
                                ...n,
                                values: Object.keys(values).length > 0 ? values : undefined,
                              };
                            }),
                          }))
                        );
                      }}
                    />
                  </Form.Item>
                ) : null}
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
                    isFunctionReturnSignatureEdit ? (
                      <div className="bp-pin-grid bp-pin-grid-outputs bp-pin-grid-dispatcher-sig">
                        <div className="bp-pin-grid-head">Name</div>
                        <div className="bp-pin-grid-head">Type</div>
                        <div className="bp-pin-grid-head" aria-hidden />
                        {selectedNode.inputs.length === 0 ? (
                          <Typography.Text type="secondary" style={{ gridColumn: "1 / -1" }}>
                            No input pins.
                          </Typography.Text>
                        ) : (
                          selectedNode.inputs.map((pin) =>
                            pin.type === "exec" ? (
                              <React.Fragment key={`${selectedNode.id}-inspector-input-${pin.name}`}>
                                <Input value={pin.name} readOnly />
                                <Input value={pin.type} readOnly />
                                <span />
                              </React.Fragment>
                            ) : (
                              <React.Fragment key={`${selectedNode.id}-inspector-fret-${pin.name}`}>
                                <Input
                                  key={`fri-${selectedNode.id}-${pin.name}`}
                                  defaultValue={pin.name}
                                  onFocus={() => {
                                    inspectorEditingRef.current = true;
                                  }}
                                  onBlur={(e) => {
                                    setFunctionReturnPayloadInputField(pin.name, "name", e.target.value);
                                    commitInspectorHistoryIfEnded();
                                  }}
                                />
                                <Input
                                  key={`frit-${selectedNode.id}-${pin.name}-${pin.type}`}
                                  defaultValue={pin.type}
                                  onFocus={() => {
                                    inspectorEditingRef.current = true;
                                  }}
                                  onBlur={(e) => {
                                    setFunctionReturnPayloadInputField(pin.name, "type", e.target.value);
                                    commitInspectorHistoryIfEnded();
                                  }}
                                />
                                <Button
                                  size="small"
                                  danger
                                  onClick={() => removeFunctionReturnPayloadInput(pin.name)}
                                >
                                  {tr("functionReturnRemovePayloadPin")}
                                </Button>
                              </React.Fragment>
                            )
                          )
                        )}
                        <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                          <Button size="small" type="dashed" onClick={addFunctionReturnPayloadInput}>
                            {tr("functionReturnAddPayloadPin")}
                          </Button>
                        </div>
                      </div>
                    ) : (
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
                    )
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
                    isDispatcherEntrySignatureEdit ? (
                      <div className="bp-pin-grid bp-pin-grid-outputs bp-pin-grid-dispatcher-sig">
                        <div className="bp-pin-grid-head">Name</div>
                        <div className="bp-pin-grid-head">Type</div>
                        <div className="bp-pin-grid-head" aria-hidden />
                        {selectedNode.outputs.length === 0 ? (
                          <Typography.Text type="secondary" style={{ gridColumn: "1 / -1" }}>
                            No output pins.
                          </Typography.Text>
                        ) : (
                          selectedNode.outputs.map((pin) =>
                            pin.type === "exec" ? (
                              <React.Fragment key={`${selectedNode.id}-inspector-output-${pin.name}`}>
                                <Input value={pin.name} readOnly />
                                <Input value={pin.type} readOnly />
                                <span />
                              </React.Fragment>
                            ) : (
                              <React.Fragment key={`${selectedNode.id}-inspector-sig-${pin.name}`}>
                                <Input
                                  key={`dn-${selectedNode.id}-${pin.name}`}
                                  defaultValue={pin.name}
                                  onFocus={() => {
                                    inspectorEditingRef.current = true;
                                  }}
                                  onBlur={(e) => {
                                    setDispatcherEntryPayloadPinField(pin.name, "name", e.target.value);
                                    commitInspectorHistoryIfEnded();
                                  }}
                                />
                                <Input
                                  key={`dt-${selectedNode.id}-${pin.name}-${pin.type}`}
                                  defaultValue={pin.type}
                                  onFocus={() => {
                                    inspectorEditingRef.current = true;
                                  }}
                                  onBlur={(e) => {
                                    setDispatcherEntryPayloadPinField(pin.name, "type", e.target.value);
                                    commitInspectorHistoryIfEnded();
                                  }}
                                />
                                <Button
                                  size="small"
                                  danger
                                  onClick={() => removeDispatcherEntryPayloadOutput(pin.name)}
                                >
                                  {tr("dispatcherEntryRemovePayloadPin")}
                                </Button>
                              </React.Fragment>
                            )
                          )
                        )}
                        <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                          <Button size="small" type="dashed" onClick={addDispatcherEntryPayloadOutput}>
                            {tr("dispatcherEntryAddPayloadPin")}
                          </Button>
                        </div>
                      </div>
                    ) : isFunctionEntrySignatureEdit ? (
                      <div className="bp-pin-grid bp-pin-grid-outputs bp-pin-grid-dispatcher-sig">
                        <div className="bp-pin-grid-head">Name</div>
                        <div className="bp-pin-grid-head">Type</div>
                        <div className="bp-pin-grid-head" aria-hidden />
                        {selectedNode.outputs.length === 0 ? (
                          <Typography.Text type="secondary" style={{ gridColumn: "1 / -1" }}>
                            No output pins.
                          </Typography.Text>
                        ) : (
                          selectedNode.outputs.map((pin) =>
                            pin.type === "exec" ? (
                              <React.Fragment key={`${selectedNode.id}-inspector-output-${pin.name}`}>
                                <Input value={pin.name} readOnly />
                                <Input value={pin.type} readOnly />
                                <span />
                              </React.Fragment>
                            ) : (
                              <React.Fragment key={`${selectedNode.id}-inspector-fentry-${pin.name}`}>
                                <Input
                                  key={`fen-${selectedNode.id}-${pin.name}`}
                                  defaultValue={pin.name}
                                  onFocus={() => {
                                    inspectorEditingRef.current = true;
                                  }}
                                  onBlur={(e) => {
                                    setFunctionEntryPayloadPinField(pin.name, "name", e.target.value);
                                    commitInspectorHistoryIfEnded();
                                  }}
                                />
                                <Input
                                  key={`fet-${selectedNode.id}-${pin.name}-${pin.type}`}
                                  defaultValue={pin.type}
                                  onFocus={() => {
                                    inspectorEditingRef.current = true;
                                  }}
                                  onBlur={(e) => {
                                    setFunctionEntryPayloadPinField(pin.name, "type", e.target.value);
                                    commitInspectorHistoryIfEnded();
                                  }}
                                />
                                <Button
                                  size="small"
                                  danger
                                  onClick={() => removeFunctionEntryPayloadOutput(pin.name)}
                                >
                                  {tr("functionEntryRemovePayloadPin")}
                                </Button>
                              </React.Fragment>
                            )
                          )
                        )}
                        <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                          <Button size="small" type="dashed" onClick={addFunctionEntryPayloadOutput}>
                            {tr("functionEntryAddPayloadPin")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bp-pin-grid bp-pin-grid-outputs">
                        <div className="bp-pin-grid-head">Name</div>
                        <div className="bp-pin-grid-head">Type</div>
                        {selectedNode.outputs.length === 0 ? (
                          <Typography.Text type="secondary" style={{ gridColumn: "1 / -1" }}>
                            No output pins.
                          </Typography.Text>
                        ) : (
                          selectedNode.outputs.map((pin) => (
                            <React.Fragment key={`${selectedNode.id}-inspector-output-${pin.name}`}>
                              <Input value={pin.name} readOnly />
                              <Input value={pin.type} readOnly />
                            </React.Fragment>
                          ))
                        )}
                      </div>
                    )
                  ) : null}
                </Form.Item>
              </Form>
            ) : selectedVariable && selectedVariableIndex !== null ? (
              <Form
                key={`var-${selectedVariableIndex}`}
                form={variableForm}
                layout="vertical"
                initialValues={{ name: selectedVariable.name, type: selectedVariable.type }}
                onValuesChange={(_c, all) => {
                  skipPushHistoryRef.current = true;
                  const i = selectedVariableIndex;
                  setDoc((prev) =>
                    mapDocAtTarget(prev, editTargetRef.current, (g) => {
                      const vars = [...g.variables];
                      if (!vars[i]) {
                        return g;
                      }
                      let name = String(all.name ?? "").trim();
                      let type = String(all.type ?? "").trim();
                      if (!name) {
                        name = vars[i].name;
                      }
                      if (!type) {
                        type = vars[i].type;
                      }
                      vars[i] = { name, type };
                      return { ...g, variables: vars };
                    })
                  );
                }}
              >
                <Typography.Title level={5}>{tr("inspectorVariableSectionTitle")}</Typography.Title>
                <Form.Item name="name" label={tr("variableNameLabel")}>
                  <Input
                    onFocus={() => {
                      inspectorEditingRef.current = true;
                    }}
                    onBlur={commitInspectorHistoryIfEnded}
                  />
                </Form.Item>
                <Form.Item name="type" label={tr("variableTypeLabel")}>
                  <Input
                    onFocus={() => {
                      inspectorEditingRef.current = true;
                    }}
                    onBlur={commitInspectorHistoryIfEnded}
                  />
                </Form.Item>
                <Form.Item>
                  <Button danger onClick={() => onExplorerRemoveVariable(selectedVariableIndex)}>
                    {tr("variableDeleteButton")}
                  </Button>
                </Form.Item>
              </Form>
            ) : (
              <>
                <Typography.Title level={5}>{tr("inspectorDocumentSection")}</Typography.Title>
                {editTarget.kind === "function" ? (
                  <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                    {tr("inspectorEditingFunction", {
                      name: doc.functions.find((f) => f.id === editTarget.id)?.name ?? editTarget.id,
                    })}
                  </Typography.Text>
                ) : null}
                {editTarget.kind === "dispatcher" ? (
                  <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                    {tr("inspectorEditingDispatcher", {
                      name: doc.dispatchers.find((d) => d.id === editTarget.id)?.name ?? editTarget.id,
                    })}
                  </Typography.Text>
                ) : null}
                <div className="bp-inspector-inherits">
                  <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                    {tr("inheritsLabel")}
                  </Typography.Text>
                  <Select
                    style={{ width: "100%" }}
                    allowClear
                    placeholder={tr("inheritsPlaceholder")}
                    value={doc.inherits}
                    disabled={subgraphOpen}
                    open={subgraphOpen ? undefined : inheritsSelectOpen}
                    onDropdownVisibleChange={subgraphOpen ? undefined : handleInheritsDropdownVisibleChange}
                    options={baseClasses.map((b) => ({ label: b.name, value: b.name }))}
                    onChange={handleInheritsSelectChange}
                  />
                </div>
                <Divider />
                <Typography.Text type="secondary">{tr("inspectorSelectTargetHint")}</Typography.Text>
              </>
            )}
          </div>
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
            Graph: {activeGraph.nodes.length} nodes / {activeGraph.edges.length} edges
          </Typography.Text>
        </div>
        <div
          className={`bp-canvas ${pan ? "bp-canvas-panning" : "bp-canvas-idle"} ${drag ? "bp-canvas-dragging" : ""
            }`}
          ref={canvasRef}
          onDragOverCapture={(e) => {
            if (![...e.dataTransfer.types].includes("application/json")) {
              return;
            }
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDropCapture={(e) => {
            const raw = e.dataTransfer.getData("application/json");
            if (!raw) {
              return;
            }
            let parsed: { kind?: string; functionId?: string };
            try {
              parsed = JSON.parse(raw) as { kind?: string; functionId?: string };
            } catch {
              return;
            }
            if (parsed.kind !== BP_DND_KIND_INVOKE_FUNCTION || typeof parsed.functionId !== "string") {
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            const world = clientToWorld(e.clientX, e.clientY);
            addInvokeFunctionNodeAtWorld(parsed.functionId, world);
          }}
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
                dismissContextMenus();
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
                dismissContextMenus();
              }
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            const target = e.target as HTMLElement | null;
            if (target?.closest(".bp-canvas-context-menu")) {
              return;
            }
            if (target?.closest(".bp-canvas-toolbar")) {
              dismissContextMenus();
              return;
            }
            if (target?.closest(".bp-canvas-legend")) {
              dismissContextMenus();
              return;
            }
            if (target?.closest(".bp-marquee")) {
              return;
            }
            const onEmptyCanvas =
              target?.classList.contains("bp-canvas") ||
              target?.classList.contains("bp-edges") ||
              Boolean(target?.closest("svg.bp-edges"));
            if (!onEmptyCanvas) {
              dismissContextMenus();
              return;
            }
            if (!canvasRef.current) {
              return;
            }
            const rect = canvasRef.current.getBoundingClientRect();
            const world = clientToWorld(e.clientX, e.clientY);
            setCanvasContextMenu({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              worldX: world.x,
              worldY: world.y,
            });
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
          <div
            className="bp-canvas-toolbar"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="bp-canvas-toolbar-rows">
              <div className="bp-canvas-toolbar-row">
            <span className="bp-canvas-toolbar-context" title={editingContextLabel}>
              <Typography.Text type="secondary" className="bp-canvas-toolbar-context-text" ellipsis>
                {editingContextLabel}
              </Typography.Text>
            </span>
            <span className="bp-canvas-toolbar-sep" aria-hidden="true" />
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Undo (Ctrl/Cmd+Z)"
              aria-label="Undo"
              disabled={historyState.index <= 0}
              onClick={onUndo}
            >
              <IconUndo />
            </button>
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Redo (Ctrl/Cmd+Y)"
              aria-label="Redo"
              disabled={historyState.index < 0 || historyState.index >= historyState.length - 1}
              onClick={onRedo}
            >
              <IconRedo />
            </button>
            <span className="bp-canvas-toolbar-sep" aria-hidden="true" />
            <Select
              size="small"
              ref={nodeFinderRef}
              className="bp-canvas-toolbar-select"
              classNames={{ popup: { root: "bp-canvas-toolbar-select-dropdown" } }}
              placeholder="Find node (Ctrl/Cmd+F)"
              value={findNodeId || undefined}
              options={nodeSearchOptions}
              onChange={(v) => setFindNodeId(String(v))}
              allowClear
              showSearch
              optionFilterProp="label"
            />
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Focus selected node in list"
              aria-label="Focus node"
              disabled={!findNodeId}
              onClick={onFocusFoundNode}
            >
              <IconFocusNode />
            </button>
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Delete selected nodes"
              aria-label="Delete node"
              disabled={selectedNodeIds.length === 0}
              onClick={onDeleteNode}
            >
              <IconDeleteNode />
            </button>
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Delete selected edge"
              aria-label="Delete edge"
              disabled={!selectedEdgeId}
              onClick={() => selectedEdgeId && onDeleteEdge(selectedEdgeId)}
            >
              <IconDeleteEdge />
            </button>
            <span className="bp-canvas-toolbar-sep" aria-hidden="true" />
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Reset view"
              aria-label="Reset view"
              onClick={() => setViewport({ x: 0, y: 0, scale: 1 })}
            >
              <IconResetView />
            </button>
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Reload node definitions"
              aria-label="Reload node definitions"
              onClick={() => vscodeApi.postMessage({ type: "requestSetting" })}
            >
              <IconReloadDefs />
            </button>
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Build"
              aria-label="Build"
              onClick={() => vscodeApi.postMessage({ type: "build" })}
            >
              <IconBuild />
            </button>
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title={showLegend ? tr("hideLegend") : tr("showLegend")}
              aria-label={showLegend ? tr("hideLegend") : tr("showLegend")}
              onClick={() => setShowLegend((prev) => !prev)}
            >
              <IconLegend />
            </button>
            <span className="bp-canvas-toolbar-sep" aria-hidden="true" />
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Align Left"
              aria-label="Align Left"
              disabled={selectedNodeIds.length < 2}
              onClick={() => onAlignSelection("left")}
            >
              <IconAlignLeft />
            </button>
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Align Right"
              aria-label="Align Right"
              disabled={selectedNodeIds.length < 2}
              onClick={() => onAlignSelection("right")}
            >
              <IconAlignRight />
            </button>
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Align Top"
              aria-label="Align Top"
              disabled={selectedNodeIds.length < 2}
              onClick={() => onAlignSelection("top")}
            >
              <IconAlignTop />
            </button>
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Align Bottom"
              aria-label="Align Bottom"
              disabled={selectedNodeIds.length < 2}
              onClick={() => onAlignSelection("bottom")}
            >
              <IconAlignBottom />
            </button>
            <span className="bp-canvas-toolbar-sep" aria-hidden="true" />
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Distribute Horizontally"
              aria-label="Distribute Horizontally"
              disabled={selectedNodeIds.length < 3}
              onClick={() => onAlignSelection("h-distribute")}
            >
              <IconDistributeH />
            </button>
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Distribute Vertically"
              aria-label="Distribute Vertically"
              disabled={selectedNodeIds.length < 3}
              onClick={() => onAlignSelection("v-distribute")}
            >
              <IconDistributeV />
            </button>
            <span className="bp-canvas-toolbar-sep" aria-hidden="true" />
            <button
              type="button"
              className="bp-canvas-toolbar-btn"
              title="Auto Layout"
              aria-label="Auto Layout"
              disabled={activeGraph.nodes.length < 2}
              onClick={onAutoLayout}
            >
              <IconAutoLayout />
            </button>
              </div>
              <div className="bp-canvas-toolbar-status">
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
                <Tag className="bp-canvas-toolbar-status-kbd">Del | Ctrl/Cmd+Z/Y | Ctrl/Cmd+A | Ctrl/Cmd+F | Ctrl/Cmd+0 | Esc</Tag>
              </div>
            </div>
          </div>
          <svg className="bp-edges">
            {activeGraph.edges.map((e) => {
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
          {activeGraph.nodes.map((node) => {
            const isConfiguredLifecycle =
              editTarget.kind === "main" && nodeTreeState.configuredLifecycleNodeIds.has(node.id);
            const isGlobalListenVisual =
              editTarget.kind === "main" && nodeTreeState.globalEventListenNodeIds.has(node.id);
            const isDispatcherEntryVisual =
              editTarget.kind === "dispatcher" && node.template === TEMPLATE_DISPATCHER_ENTRY;
            const lifecycleBlue =
              isConfiguredLifecycle || isDispatcherEntryVisual || isGlobalListenVisual;
            const illegalTree =
              !isConfiguredLifecycle &&
              !isDispatcherEntryVisual &&
              !isGlobalListenVisual &&
              nodeTreeState.illegalNodes.has(node.id);
            const legalGreen =
              !isConfiguredLifecycle &&
              !isDispatcherEntryVisual &&
              !isGlobalListenVisual &&
              !illegalTree &&
              nodeTreeState.legalNodes.has(node.id);
            const canvasTargetSubtitle = getNodeCanvasTargetSubtitle(node);
            return (
            <Card
              key={node.id}
              size="small"
              className={`bp-node ${lifecycleBlue ? "bp-node-root" : ""
                } ${legalGreen ? "bp-node-legal" : ""
                } ${illegalTree ? "bp-node-illegal" : ""
                } ${selectedNodeId === node.id || selectedNodeIds.includes(node.id) ? "bp-node-selected" : ""
                } ${selectedNodeId === node.id ? "bp-node-selected-primary" : ""
                } ${issueNodeIds.has(node.id) ? "bp-node-issue" : ""
                } ${extraRootNodeIds.has(node.id) ? "bp-node-extra-root-warning" : ""
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
                  <div className="bp-node-title-stack">
                    <span className="bp-node-title-text">{node.title}</span>
                    {canvasTargetSubtitle ? (
                      <span className="bp-node-title-target" title={canvasTargetSubtitle.title}>
                        {canvasTargetSubtitle.text}
                      </span>
                    ) : null}
                  </div>
                  <span className="bp-node-title-index">{nodeTreeState.numberById.get(node.id) ?? "-"}</span>
                </div>
              }
              onMouseDown={(e) => {
                if (e.button !== 0) {
                  return;
                }
                e.stopPropagation();
                dismissContextMenus();
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
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (e.target instanceof Element && e.target.closest(".bp-pin")) {
                  return;
                }
                setDrag(null);
                selectNodeAndCenterInViewport(node.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
                        aria-label={getPinHoverTitle(pin)}
                        className={`bp-pin bp-pin-input ${invalidPinFlash?.direction === "input" &&
                          invalidPinFlash.nodeId === node.id &&
                          invalidPinFlash.pinName === pin.name
                          ? "bp-pin-invalid"
                          : hoveredInputPin?.nodeId === node.id && hoveredInputPin.pinName === pin.name
                            ? hoveredInputPin.canConnect
                              ? "bp-pin-connectable"
                              : "bp-pin-unconnectable"
                            : ""
                          } ${getPinTypeClassName(pin.type)}`}
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
                        onMouseEnter={(e) => {
                          updatePinTypeTooltip(pin, e);
                          if (!pending) {
                            return;
                          }
                          const hk = validateConnectionHintKey(activeGraph, pending, node.id, pin.name);
                          setHoveredInputPin({
                            nodeId: node.id,
                            pinName: pin.name,
                            canConnect:
                              hk === null || hk === "connectionExecInputAlreadyConnected",
                          });
                        }}
                        onMouseMove={(e) => {
                          updatePinTypeTooltip(pin, e);
                        }}
                        onMouseLeave={() => {
                          setPinTypeTooltip(null);
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
                        aria-label={getPinHoverTitle(pin)}
                        className={`bp-pin bp-pin-output ${getPinTypeClassName(pin.type)}`}
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
                        onMouseEnter={(e) => {
                          updatePinTypeTooltip(pin, e);
                        }}
                        onMouseMove={(e) => {
                          updatePinTypeTooltip(pin, e);
                        }}
                        onMouseLeave={() => {
                          setPinTypeTooltip(null);
                        }}
                      >
                        {pin.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            );
          })}
          {pinTypeTooltip ? (
            <div
              className="bp-pin-type-tooltip"
              style={{ left: pinTypeTooltip.left, top: pinTypeTooltip.top }}
            >
              {pinTypeTooltip.text}
            </div>
          ) : null}
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
          {canvasContextMenu ? (
            <div
              className="bp-canvas-context-menu"
              style={{ left: canvasContextMenu.x, top: canvasContextMenu.y }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="bp-canvas-context-menu-title">Add node from template</div>
              {templateOptions.length === 0 ? (
                <div className="bp-canvas-context-menu-empty">No node templates loaded.</div>
              ) : (
                <>
                  <Input
                    ref={addNodeMenuSearchRef}
                    size="small"
                    allowClear
                    placeholder="Search templates…"
                    value={addNodeTemplateQuery}
                    onChange={(e) => setAddNodeTemplateQuery(e.target.value)}
                    className="bp-canvas-context-menu-search"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key !== "Escape") {
                        e.stopPropagation();
                      }
                    }}
                  />
                  {filteredTemplateMenuGroups.length === 0 ? (
                    <div className="bp-canvas-context-menu-empty">No matching templates.</div>
                  ) : (
                    filteredTemplateMenuGroups.map((group) => (
                      <div key={group.label} className="bp-canvas-context-menu-group">
                        <div className="bp-canvas-context-menu-group-label">{group.label}</div>
                        {group.options.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className="bp-canvas-context-menu-item"
                            onClick={() =>
                              addNodeFromTemplate(opt.value, {
                                x: canvasContextMenu.worldX,
                                y: canvasContextMenu.worldY,
                              })
                            }
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          ) : null}
          {showLegend ? (
            <div className="bp-canvas-legend">
              <div className="bp-canvas-legend-title">{tr("legendTitle")}</div>
              <div className="bp-canvas-legend-item">
                <span className="bp-canvas-legend-swatch bp-canvas-legend-swatch-root" />
                <span>{tr("legendRoot")}</span>
              </div>
              <div className="bp-canvas-legend-item">
                <span className="bp-canvas-legend-swatch bp-canvas-legend-swatch-legal" />
                <span>{tr("legendLegal")}</span>
              </div>
              <div className="bp-canvas-legend-item">
                <span className="bp-canvas-legend-swatch bp-canvas-legend-swatch-illegal" />
                <span>{tr("legendIllegal")}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <Modal
        title={tr("functionRenameModalTitle")}
        open={functionRenameModal !== null}
        onOk={applyFunctionRename}
        onCancel={() => setFunctionRenameModal(null)}
        okText={tr("functionRenameOk")}
        cancelText={tr("functionCancel")}
        destroyOnClose
      >
        <Input
          value={functionRenameDraft}
          onChange={(e) => setFunctionRenameDraft(e.target.value)}
          onPressEnter={() => applyFunctionRename()}
          placeholder={tr("functionRenamePlaceholder")}
        />
      </Modal>
      <Modal
        title={tr("dispatcherRenameModalTitle")}
        open={dispatcherRenameModal !== null}
        onOk={applyDispatcherRename}
        onCancel={() => setDispatcherRenameModal(null)}
        okText={tr("functionRenameOk")}
        cancelText={tr("functionCancel")}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Input
            value={dispatcherRenameDraft}
            onChange={(e) => setDispatcherRenameDraft(e.target.value)}
            onPressEnter={() => applyDispatcherRename()}
            placeholder={tr("dispatcherRenamePlaceholder")}
          />
          <Input
            value={dispatcherRenameIdDraft}
            onChange={(e) => setDispatcherRenameIdDraft(e.target.value)}
            onPressEnter={() => applyDispatcherRename()}
            placeholder={tr("dispatcherTechnicalIdPlaceholder")}
            addonBefore={tr("dispatcherTechnicalIdLabel")}
          />
        </Space>
      </Modal>
    </App>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <EditorApp />
  </React.StrictMode>
);
