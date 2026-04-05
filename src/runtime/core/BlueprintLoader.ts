// Auto-generated from res/y.blueprint.js

import { BlueprintResource } from "./BlueprintResource";
import type { BlueprintAssetJson } from "../../shared/JsonType/BlueprintJsonTypes";

/**
 * Build a {@link BlueprintResource} from already-loaded blueprint JSON (environment-agnostic).
 * Host/network loading belongs in `src/adapter` (see {@link BlueprintLoader} there).
 */
export function createBlueprintResourceFromJson(
  bid: string,
  data: BlueprintAssetJson,
  options?: { name?: string }
): BlueprintResource | null {
  if (data._$ver == null) {
    console.error("Unknow Version!");
    return null;
  }
  const bp = new BlueprintResource(bid);
  if (options?.name !== undefined) {
    bp.name = options.name;
  }
  bp.initClass(data);
  return bp;
}
