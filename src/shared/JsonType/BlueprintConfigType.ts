/**
 * JSON shape of `blueprint.config.json` (project manifest: node palette, base classes, global events).
 *
 * **Parsers / consumers**
 * - {@link parseEditorBlueprintConfig} — full editor config (may still accept legacy `baseClasses` as an array; canonical JSON uses a record).
 * - {@link parseGlobalEventChannels}, {@link parseRuntimeGlobalEventTemplates} — partial fields.
 * - {@link blueprintConfigToRuntimeExtends} — maps `baseClasses` into runtime `extendsData`.
 *
 * **Pin strings** (in `nodeDefs`, lifecycle hooks, global event channels): `"name:type"` (e.g. `"exec:exec"`, `"deltaTime:number"`),
 * or object `{ "name", "type" }`. Bare string without `:` is treated as name; type defaults to `exec` if name is `exec`, else `string`.
 *
 * **Canonical file root** (`BlueprintConfigFileJson`): exactly {@link BlueprintConfigRootJson}. All four top-level keys must be present;
 * list fields may be empty arrays; `baseClasses` is a **record only** (empty `{}` when unused).
 */

/** Pin entry as stored in JSON (before normalization to `{ name, type }`). */
export type BlueprintConfigPinJson =
  | string
  | {
      name: string;
      type: string;
    };

/**
 * Lifecycle hook on a base class. Callback parameters are listed as `outputs` or legacy `params` (same pin format as nodeDefs).
 * String form `{ "name": "onTick" }` means no extra output pins beyond the Event.Start template.
 */
export type BlueprintConfigLifecycleHookJson =
  | string
  | {
      name: string;
      outputs?: BlueprintConfigPinJson[];
      /** Alias of `outputs` (editor treats these as Event.Start output pins). */
      params?: BlueprintConfigPinJson[];
    };

/** Hook list for one base class (value under `baseClasses[className]`). */
export type BlueprintConfigBaseClassObjectEntryJson = {
  lifecycle?: BlueprintConfigLifecycleHookJson[];
  /** Alias of `lifecycle`. */
  lifecycleEvents?: BlueprintConfigLifecycleHookJson[];
};

/** Global event channel manifest entry. Payload may be under `payload` or legacy `outputs` (exec pins are stripped when parsing). */
export type BlueprintConfigGlobalEventChannelJson = {
  id: string;
  payload?: BlueprintConfigPinJson[];
  outputs?: BlueprintConfigPinJson[];
};

export type BlueprintConfigRuntimeTemplatesJson = {
  globalEventEmit?: string;
  globalEventListen?: string;
};

/** Node definition entry (palette / inspector); `name` is the template id (e.g. `Event.Start`, `Debug.Print`). */
export type BlueprintConfigNodeDefJson = {
  name: string;
  title?: string;
  category?: string;
  type?: string;
  desc?: string;
  icon?: string;
  inputs?: BlueprintConfigPinJson[];
  outputs?: BlueprintConfigPinJson[];
  defaults?: Record<string, string | number | boolean>;
};

/**
 * Full `blueprint.config.json` root. `baseClasses` is a **record** (class name → hook config).
 * Every property is required; use `[]` or `{}` when a section is unused.
 */
export type BlueprintConfigRootJson = {
  baseClasses: Record<string, BlueprintConfigBaseClassObjectEntryJson>;
  globalEventChannels: BlueprintConfigGlobalEventChannelJson[];
  runtimeTemplates: BlueprintConfigRuntimeTemplatesJson;
  nodeDefs: BlueprintConfigNodeDefJson[];
};

/** Same as {@link BlueprintConfigRootJson} — the only supported on-disk root shape for this contract. */
export type BlueprintConfigFileJson = BlueprintConfigRootJson;
