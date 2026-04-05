import * as fs from "fs";
import * as path from "path";
import {
  parseGlobalEventChannels,
  parseRuntimeGlobalEventTemplates,
} from "../blueprint/parseBlueprintConfig";
import type { ValidateBlueprintOptions } from "./validateBlueprintDocument";

export function findBlueprintConfigPath(workspaceRoot: string, blueprintFilePath: string): string | null {
  let cur = path.dirname(path.resolve(blueprintFilePath));
  const root = path.resolve(workspaceRoot);
  while (true) {
    const candidate = path.join(cur, "blueprint.config.json");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    if (cur === root) {
      break;
    }
    const parent = path.dirname(cur);
    if (parent === cur) {
      break;
    }
    cur = parent;
  }
  const rootCandidate = path.join(root, "blueprint.config.json");
  return fs.existsSync(rootCandidate) ? rootCandidate : null;
}

export function loadValidateOptionsForBlueprint(
  workspaceRoot: string,
  blueprintFilePath: string
): ValidateBlueprintOptions {
  const cfgPath = findBlueprintConfigPath(workspaceRoot, blueprintFilePath);
  if (!cfgPath) {
    return {};
  }
  try {
    const text = fs.readFileSync(cfgPath, "utf-8");
    const parsed = JSON.parse(text) as unknown;
    const globalEventChannels = parseGlobalEventChannels(parsed);
    const rt = parseRuntimeGlobalEventTemplates(parsed);
    return {
      globalEventChannels,
      globalEventEmitTemplate: rt.globalEventEmit,
      globalEventListenTemplate: rt.globalEventListen,
    };
  } catch {
    return {};
  }
}

export function loadEmitOptionsForBlueprint(
  workspaceRoot: string,
  blueprintFilePath: string
): { globalEventEmitTemplate: string; globalEventListenTemplate: string } {
  const cfgPath = findBlueprintConfigPath(workspaceRoot, blueprintFilePath);
  if (!cfgPath) {
    return {
      globalEventEmitTemplate: "",
      globalEventListenTemplate: "",
    };
  }
  try {
    const text = fs.readFileSync(cfgPath, "utf-8");
    const parsed = JSON.parse(text) as unknown;
    const rt = parseRuntimeGlobalEventTemplates(parsed);
    return {
      globalEventEmitTemplate: rt.globalEventEmit,
      globalEventListenTemplate: rt.globalEventListen,
    };
  } catch {
    return {
      globalEventEmitTemplate: "",
      globalEventListenTemplate: "",
    };
  }
}
