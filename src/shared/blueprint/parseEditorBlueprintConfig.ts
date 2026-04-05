/**
 * Parse full `blueprint.config.json` shape used by the editor (node defs, base classes, global events).
 * Shared by the VS Code host and runtime adapters — no VS Code dependency.
 */

import type { BaseClassDef, GlobalEventChannelDef, LifecycleHookDef, NodeDef, NodeDefPin } from "../blueprint-config";
import { parseGlobalEventChannels, parseRuntimeGlobalEventTemplates } from "./parseBlueprintConfig";

export type EditorBlueprintConfig = {
  nodeDefs: NodeDef[];
  baseClasses: BaseClassDef[];
  globalEventChannels: GlobalEventChannelDef[];
  globalEventEmitTemplate: string;
  globalEventListenTemplate: string;
};

function parsePinEntry(raw: unknown): NodeDefPin | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.includes(":")) {
      const [n, t] = trimmed.split(":");
      const name = (n ?? "").trim();
      const type = (t ?? "").trim();
      if (!name || !type) {
        return null;
      }
      return { name, type };
    }
    return { name: trimmed, type: trimmed === "exec" ? "exec" : "string" };
  }
  if (
    raw &&
    typeof raw === "object" &&
    typeof (raw as { name?: unknown }).name === "string" &&
    typeof (raw as { type?: unknown }).type === "string"
  ) {
    return {
      name: (raw as { name: string }).name.trim(),
      type: (raw as { type: string }).type.trim(),
    };
  }
  return null;
}

function parseLifecycleHookEntry(raw: unknown): LifecycleHookDef | null {
  if (typeof raw === "string") {
    const name = raw.trim();
    return name ? { name, outputs: [] } : null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.name !== "string" || !o.name.trim()) {
    return null;
  }
  const name = o.name.trim();
  const rawOut = o.outputs !== undefined ? o.outputs : o.params;
  const outputs = Array.isArray(rawOut)
    ? rawOut.map(parsePinEntry).filter((v): v is NodeDefPin => !!v)
    : [];
  return { name, outputs };
}

function parseLifecycleArray(arr: unknown): LifecycleHookDef[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  const seen = new Set<string>();
  const out: LifecycleHookDef[] = [];
  for (const raw of arr) {
    const hook = parseLifecycleHookEntry(raw);
    if (!hook || seen.has(hook.name)) {
      continue;
    }
    seen.add(hook.name);
    out.push(hook);
  }
  return out;
}

function normalizeNodeDef(raw: unknown): NodeDef | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.name !== "string" || !obj.name.trim()) {
    return null;
  }
  const inputs = Array.isArray(obj.inputs)
    ? obj.inputs.map(parsePinEntry).filter((v): v is NodeDefPin => !!v)
    : undefined;
  const outputs = Array.isArray(obj.outputs)
    ? obj.outputs.map(parsePinEntry).filter((v): v is NodeDefPin => !!v)
    : undefined;
  return {
    name: obj.name.trim(),
    title: typeof obj.title === "string" ? obj.title : undefined,
    category: typeof obj.category === "string" ? obj.category : undefined,
    type: typeof obj.type === "string" ? obj.type : undefined,
    desc: typeof obj.desc === "string" ? obj.desc : undefined,
    icon: typeof obj.icon === "string" ? obj.icon : undefined,
    inputs,
    outputs,
    defaults:
      obj.defaults && typeof obj.defaults === "object"
        ? (obj.defaults as Record<string, string | number | boolean>)
        : undefined,
  };
}

function parseBaseClasses(parsed: unknown): BaseClassDef[] {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return [];
  }
  const bc = (parsed as { baseClasses?: unknown }).baseClasses;
  if (!bc || typeof bc !== "object") {
    return [];
  }
  const out: BaseClassDef[] = [];
  if (Array.isArray(bc)) {
    for (const entry of bc) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const o = entry as Record<string, unknown>;
      if (typeof o.name !== "string" || !o.name.trim()) {
        continue;
      }
      const lifecycle = parseLifecycleArray(
        Array.isArray(o.lifecycle)
          ? o.lifecycle
          : Array.isArray(o.lifecycleEvents)
            ? o.lifecycleEvents
            : [],
      );
      out.push({ name: o.name.trim(), lifecycle });
    }
    return out;
  }
  for (const [name, v] of Object.entries(bc as Record<string, unknown>)) {
    const key = name.trim();
    if (!key) {
      continue;
    }
    let lifecycle: LifecycleHookDef[] = [];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const vo = v as Record<string, unknown>;
      if (Array.isArray(vo.lifecycle)) {
        lifecycle = parseLifecycleArray(vo.lifecycle);
      } else if (Array.isArray(vo.lifecycleEvents)) {
        lifecycle = parseLifecycleArray(vo.lifecycleEvents);
      }
    }
    out.push({ name: key, lifecycle });
  }
  return out;
}

/** Parse editor-facing fields from already-parsed blueprint.config.json root object. */
export function parseEditorBlueprintConfig(parsed: unknown): EditorBlueprintConfig {
  const list = Array.isArray(parsed)
    ? parsed
    : (parsed as { nodeDefs?: unknown[] })?.nodeDefs && Array.isArray((parsed as { nodeDefs: unknown[] }).nodeDefs)
      ? (parsed as { nodeDefs: unknown[] }).nodeDefs
      : [];
  const nodeDefs = list.map(normalizeNodeDef).filter((v): v is NodeDef => !!v);
  const baseClasses = parseBaseClasses(parsed);
  const globalEventChannels = parseGlobalEventChannels(parsed);
  const rt = parseRuntimeGlobalEventTemplates(parsed);
  return {
    nodeDefs,
    baseClasses,
    globalEventChannels,
    globalEventEmitTemplate: rt.globalEventEmit,
    globalEventListenTemplate: rt.globalEventListen,
  };
}
