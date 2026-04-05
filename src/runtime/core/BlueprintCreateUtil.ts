// Auto-generated from res/y.blueprint.js

import { initBlueprintCore } from "./runtime/initBlueprintCore";
import { registerBlueprintFunctions } from "./node/registerFunctions";
import { registerBlueprintNodes } from "./node/registerNodes";

export class BlueprintCreateUtil {
    public event: (...args: unknown[]) => unknown;
    public off: (
        eventName: string,
        caller: unknown,
        cb: (...args: unknown[]) => unknown,
    ) => unknown;
    public offAll: (eventName: string) => unknown;
    public on: (eventName: string, caller: unknown, cb: (...args: unknown[]) => unknown) => unknown;
    /**
     * Compatibility entrypoint (generated code expected this symbol).
     * Prefer calling `initBlueprintRuntime(...)` from `src/adapter`.
     */
    public static __init__(bpConfig: unknown) {
        initBlueprintCore({ bpConfigJson: bpConfig as any });
        return Promise.resolve();
    }

    public static reg() {
        registerBlueprintNodes();
        registerBlueprintFunctions();
    }
}
