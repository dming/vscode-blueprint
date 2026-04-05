import type { BlueprintRuntimeAdapters } from "../core/runtime/BlueprintAdapters";
import { initBlueprintCore } from "../core/runtime/initBlueprintCore";

/**
 * Host-facing initializer.
 * Call this from your application to initialize bp-runtime core with adapters.
 */
export function initBlueprintRuntime(
    bpConfigJson: Record<string, unknown> | string,
    adapters?: BlueprintRuntimeAdapters,
) {
    return initBlueprintCore({ bpConfigJson, adapters });
}

