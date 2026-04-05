import type {
  BlueprintAssetJson,
  BlueprintJsonItem,
} from "../../shared/JsonType/BlueprintJsonTypes";
import type {
  BlueprintDocument,
  BlueprintGraphBody,
  BlueprintNode,
} from "../../shared/blueprint/documentModel";
import {
  NODE_VALUE_LIFECYCLE_HOOK,
  TEMPLATE_EVENT_START,
} from "../../shared/blueprint/documentModel";

const TEMPLATE_DEBUG_PRINT = "Debug.Print";

export type DocumentToRuntimeAssetResult =
  | { ok: true; asset: BlueprintAssetJson }
  | { ok: false; error: string };

function collectExecChain(
  graph: BlueprintGraphBody,
  startNodeId: string
): { orderedIds: string[]; error?: string } {
  const execOut = new Map<string, string>();
  for (const e of graph.edges) {
    if (e.fromPin === "exec" && e.toPin === "exec") {
      if (execOut.has(e.fromNodeId)) {
        return {
          orderedIds: [],
          error: "Multiple exec edges from one node are not supported in this MVP converter",
        };
      }
      execOut.set(e.fromNodeId, e.toNodeId);
    }
  }
  const ordered: string[] = [];
  let cur: string | undefined = startNodeId;
  const seen = new Set<string>();
  while (cur) {
    if (seen.has(cur)) {
      return { orderedIds: [], error: "Cycle in exec chain" };
    }
    seen.add(cur);
    ordered.push(cur);
    cur = execOut.get(cur);
  }
  return { orderedIds: ordered };
}

function buildLinkToNext(nextId: string | undefined): Record<string, unknown> {
  if (!nextId) {
    return {};
  }
  return {
    "out_-1": {
      infoArr: [{ nodeId: nextId, id: "-1" }],
    },
  };
}

/**
 * Convert the editor's main `graph` into a minimal runtime {@link BlueprintAssetJson}.
 * **MVP:** linear exec chain only; templates must be `Event.Start` (with `lifecycleHook`) and `Debug.Print` only.
 */
export function documentToRuntimeAsset(
  doc: BlueprintDocument,
  options?: { lifecycleHook?: string }
): DocumentToRuntimeAssetResult {
  const baseClass = doc.inherits?.trim() || "Actor";
  const graph = doc.graph;
  const wantHook = options?.lifecycleHook?.trim();

  let startNode: BlueprintNode | undefined;
  if (wantHook) {
    startNode = graph.nodes.find(
      (n) =>
        n.template === TEMPLATE_EVENT_START &&
        String(n.values?.[NODE_VALUE_LIFECYCLE_HOOK] ?? "").trim() === wantHook
    );
  }
  if (!startNode) {
    startNode = graph.nodes.find(
      (n) =>
        n.template === TEMPLATE_EVENT_START &&
        String(n.values?.[NODE_VALUE_LIFECYCLE_HOOK] ?? "").trim().length > 0
    );
  }
  if (!startNode) {
    return { ok: false, error: "No Event.Start node with lifecycleHook in main graph" };
  }

  const lifecycleHook = String(startNode.values![NODE_VALUE_LIFECYCLE_HOOK]).trim();
  const chain = collectExecChain(graph, startNode.id);
  if (chain.error) {
    return { ok: false, error: chain.error };
  }

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const arr: BlueprintJsonItem[] = [];

  for (let i = 0; i < chain.orderedIds.length; i++) {
    const id = chain.orderedIds[i]!;
    const nextId = chain.orderedIds[i + 1];
    const node = nodeById.get(id);
    if (!node) {
      return { ok: false, error: `Missing node ${id}` };
    }

    if (node.template === TEMPLATE_EVENT_START) {
      arr.push({
        id: node.id,
        cid: `event_${lifecycleHook}`,
        target: baseClass,
        output: buildLinkToNext(nextId),
      });
    } else if (node.template === TEMPLATE_DEBUG_PRINT) {
      arr.push({
        id: node.id,
        cid: "web_consoleLog",
        target: "system",
        inputValue: {
          text: node.values?.text != null ? String(node.values.text) : "",
        },
        output: buildLinkToNext(nextId),
      });
    } else {
      return {
        ok: false,
        error: `Unsupported node template in MVP chain: ${node.template ?? "(none)"}`,
      };
    }
  }

  return {
    ok: true,
    asset: {
      _$ver: 1,
      extends: baseClass,
      blueprintArr: {
        main: { arr },
      },
    },
  };
}
