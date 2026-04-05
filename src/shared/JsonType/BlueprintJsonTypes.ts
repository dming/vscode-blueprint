/**
 * ## Editor `*.bp.json` (VS Code blueprint document)
 *
 * **Normalized shape** (what the editor works with after `normalizeBlueprintDocumentValue` in `documentModel.ts`) is re-exported below
 * from `documentModel.ts` under the same type names (`BlueprintDocument`, `BlueprintGraphBody`, …).
 *
 * **Top-level (current format)**
 * - `formatVersion` — number, ≥ 1 when present; default normalized to `1`.
 * - `graph` — main graph: `id`, `name`, `nodes[]`, `edges[]`, `variables[]`.
 * - `functions[]` — optional user function graphs (same body shape as `graph` without dispatcher wrapper).
 * - `dispatchers[]` — `{ id, name, graph }` listener subgraphs.
 * - `inherits` — optional base class name (must match `blueprint.config.json` `baseClasses`).
 * - `metadata` — arbitrary object.
 *
 * **Graph body**: `nodes` have `id`, `title`, `x`, `y`, `inputs` / `outputs` as `{ name, type }[]`, optional `template` (nodeDef name),
 * `description`, `isRoot`, `values` (pin defaults / node parameters, string map).
 * **Edges**: `id`, `fromNodeId`, `fromPin`, `toNodeId`, `toPin` (pin names, not types).
 *
 * **Legacy v2**: root may use `graphs[]` instead of `graph`. First entry becomes `graph`; entries with `"kind": "function"` merge into
 * `functions`. Root-level `variables` may be merged into the main graph. See `normalizeBlueprintDocumentValue`.
 *
 * ---
 *
 * ## Runtime engine asset JSON (Laya-style)
 *
 * Loaded by `BlueprintLoader` / `blueprintLoader`; not the same as editor `.bp.json`. Produced by adapters such as `documentToRuntimeAsset`.
 */

export type {
  BlueprintDispatcher,
  BlueprintDocument,
  BlueprintEdge,
  BlueprintGraphBody,
  BlueprintNode,
  BlueprintPin,
  BlueprintVariable,
} from "../blueprint/documentModel";

/**
 * Loose root object accepted before normalization (optional legacy `graphs[]` and other keys). Prefer
 * {@link BlueprintDocument} for the canonical in-memory/editor shape.
 */
export type BlueprintEditorDocumentFileJson = Record<string, unknown>;

/** Serialized blueprint graph item (node + link payload). */
export type BlueprintJsonItem = Record<string, unknown>;

/** Data map filled by `BlueprintData.formatData` and used during graph parsing/execution. */
export type BlueprintDataMap = Record<string, unknown>;

export interface BlueprintFunctionGraphJson {
  id: string | number;
  name: string;
  arr: BlueprintJsonItem[];
  properties?: Array<Record<string, unknown>>;
  output?: Array<Record<string, unknown>>;
  variable?: Array<{ name: string; [key: string]: unknown }>;
  modifiers?: { isStatic?: boolean } & Record<string, unknown>;
  caption?: string;
  tips?: string;
  [key: string]: unknown;
}

export interface BlueprintGraphBucketJson {
  arr: BlueprintJsonItem[];
}

export interface BlueprintAssetJson {
  _$ver?: unknown;
  extends?: string;
  blueprintArr: Record<string, BlueprintGraphBucketJson>;
  variable?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
  functions?: BlueprintFunctionGraphJson[];
  preload?: string[] | null;
  globalInfo?: { isRunningInIDE?: unknown } & Record<string, unknown>;
  [key: string]: unknown;
}

/** Payload object passed into `BlueprintFactory.parseCls` as `data`. */
export interface BlueprintParsePayload {
  id: string | number;
  name: string;
  dataMap: BlueprintDataMap;
  arr: BlueprintJsonItem[];
  [key: string]: unknown;
}
