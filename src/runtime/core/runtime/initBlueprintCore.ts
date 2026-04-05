import { BlueprintCreateUtil } from "../BlueprintCreateUtil";
import { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import { BlueprintFactory } from "../BlueprintFactory";
import { BlueprintRuntime } from "../BlueprintRuntime";
import { BlueprintUtil } from "../BlueprintUtil";
import { ClassUtil } from "../ClassUtil";
import { extendsData } from "../BlueprintStores";
import { createDefaultAdapters, type BlueprintRuntimeAdapters } from "./BlueprintAdapters";

export type BlueprintConfigJson = Record<string, unknown>;

export type InitBlueprintCoreOptions = {
    bpConfigJson: BlueprintConfigJson | string;
    adapters?: BlueprintRuntimeAdapters;
};

export function initBlueprintCore(options: InitBlueprintCoreOptions) {
    const adapters = { ...createDefaultAdapters(), ...(options.adapters ?? {}) };

    const json =
        typeof options.bpConfigJson === "string"
            ? (JSON.parse(options.bpConfigJson) as BlueprintConfigJson)
            : options.bpConfigJson;

    for (const key in json) {
        extendsData[key] = json[key];
    }

    // Inject reflection/serialization hooks into ClassUtil.
    ClassUtil.getNodeCtor = adapters.reflection?.getNodeCtor ?? null;
    ClassUtil.getComponentCtor = adapters.reflection?.getComponentCtor ?? null;
    ClassUtil.getClassByName = adapters.reflection?.getClassByName ?? (() => null);
    ClassUtil.decodeObj = adapters.serialization?.decodeObj ?? ((value) => value);

    // Bridge BlueprintUtil class registry to host reflection when provided.
    BlueprintUtil.getClass = (ext: string) => {
        return (
            adapters.reflection?.getClassByName?.(ext) ??
            (BlueprintUtil.classMap
                ? (BlueprintUtil.classMap as Record<string, unknown>)[ext]
                : undefined)
        );
    };
    BlueprintUtil.regClass = (name: string, cls: unknown) => {
        adapters.reflection?.regClass?.(name, cls);
        (BlueprintUtil.classMap as Record<string, unknown>)[name] = cls;
    };

    // Store adapters for runtime-created instances.
    BlueprintFactory.setAdapters(adapters);
    BlueprintFactory.BPRuntimeCls = BlueprintRuntime;
    BlueprintFactory.BPExecuteCls = BlueprintExecuteNode;

    BlueprintCreateUtil.reg();
    BlueprintUtil.initConstNode();

    return adapters;
}
