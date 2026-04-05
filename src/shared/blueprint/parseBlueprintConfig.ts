/**
 * Shared parsing of optional `blueprint.config.json` fields (no VS Code dependency).
 * Used by the extension webview loader and CLI-style build validation.
 */

import type { GlobalEventChannelDef, NodeDefPin } from "../blueprint-config";

export const DEFAULT_GLOBAL_EVENT_EMIT_TEMPLATE = "Engine.GlobalEvent.Emit";
export const DEFAULT_GLOBAL_EVENT_LISTEN_TEMPLATE = "Engine.GlobalEvent.Listen";

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

/** Parse `globalEventChannels` from blueprint.config.json root. */
export function parseGlobalEventChannels(parsed: unknown): GlobalEventChannelDef[] {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return [];
  }
  const raw = (parsed as { globalEventChannels?: unknown }).globalEventChannels;
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: GlobalEventChannelDef[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const o = entry as Record<string, unknown>;
    if (typeof o.id !== "string" || !o.id.trim()) {
      continue;
    }
    const id = o.id.trim();
    const rawPayload = o.payload !== undefined ? o.payload : o.outputs;
    const payload: NodeDefPin[] = [];
    if (Array.isArray(rawPayload)) {
      for (const p of rawPayload) {
        const pin = parsePinEntry(p);
        if (pin && pin.type !== "exec") {
          payload.push(pin);
        }
      }
    }
    out.push({ id, payload });
  }
  return out;
}

export type RuntimeGlobalEventTemplates = {
  globalEventEmit: string;
  globalEventListen: string;
};

/** Parse `runtimeTemplates.globalEventEmit` / `globalEventListen` with defaults. */
export function parseRuntimeGlobalEventTemplates(parsed: unknown): RuntimeGlobalEventTemplates {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      globalEventEmit: DEFAULT_GLOBAL_EVENT_EMIT_TEMPLATE,
      globalEventListen: DEFAULT_GLOBAL_EVENT_LISTEN_TEMPLATE,
    };
  }
  const rt = (parsed as { runtimeTemplates?: unknown }).runtimeTemplates;
  if (!rt || typeof rt !== "object" || Array.isArray(rt)) {
    return {
      globalEventEmit: DEFAULT_GLOBAL_EVENT_EMIT_TEMPLATE,
      globalEventListen: DEFAULT_GLOBAL_EVENT_LISTEN_TEMPLATE,
    };
  }
  const o = rt as Record<string, unknown>;
  const emit =
    typeof o.globalEventEmit === "string" && o.globalEventEmit.trim()
      ? o.globalEventEmit.trim()
      : DEFAULT_GLOBAL_EVENT_EMIT_TEMPLATE;
  const listen =
    typeof o.globalEventListen === "string" && o.globalEventListen.trim()
      ? o.globalEventListen.trim()
      : DEFAULT_GLOBAL_EVENT_LISTEN_TEMPLATE;
  return { globalEventEmit: emit, globalEventListen: listen };
}
