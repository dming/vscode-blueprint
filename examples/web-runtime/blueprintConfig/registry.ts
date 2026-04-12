import type {
  BlueprintConfigGlobalEventChannelJson,
  BlueprintConfigLifecycleHookJson,
  BlueprintConfigNodeDefJson,
  BlueprintConfigRootJson,
  BlueprintConfigRuntimeTemplatesJson,
} from "../../../src/shared/JsonType/BlueprintConfigType";

const baseClasses: Record<string, { lifecycle: BlueprintConfigLifecycleHookJson[] }> = {};
const nodeDefs: BlueprintConfigNodeDefJson[] = [];
let globalEventChannels: BlueprintConfigGlobalEventChannelJson[] = [];
let runtimeTemplates: BlueprintConfigRuntimeTemplatesJson = {};

export function resetRegistry(): void {
  for (const k of Object.keys(baseClasses)) {
    delete baseClasses[k];
  }
  nodeDefs.length = 0;
  globalEventChannels = [];
  runtimeTemplates = {};
}

export function registerBaseClass(
  name: string,
  lifecycle: BlueprintConfigLifecycleHookJson[],
): void {
  baseClasses[name] = { lifecycle: [...lifecycle] };
}

export function registerNodeDef(def: BlueprintConfigNodeDefJson): void {
  nodeDefs.push({ ...def });
}

export function setGlobalEventChannels(channels: BlueprintConfigGlobalEventChannelJson[]): void {
  globalEventChannels = [...channels];
}

export function setRuntimeTemplates(templates: BlueprintConfigRuntimeTemplatesJson): void {
  runtimeTemplates = { ...templates };
}

/** Canonical root shape for `blueprint.config.json` (editor + runtime adapters). */
export function getBlueprintConfigRoot(): BlueprintConfigRootJson {
  const sortedBaseKeys = Object.keys(baseClasses).sort();
  const sortedBaseClasses: BlueprintConfigRootJson["baseClasses"] = {};
  for (const k of sortedBaseKeys) {
    sortedBaseClasses[k] = baseClasses[k]!;
  }
  return {
    baseClasses: sortedBaseClasses,
    globalEventChannels: [...globalEventChannels],
    runtimeTemplates: { ...runtimeTemplates },
    nodeDefs: [...nodeDefs],
  };
}
