import type { ClassConstructor } from "../ClassUtil";

export type BlueprintAnyFunc = (...args: unknown[]) => unknown;

export interface BlueprintEventsAdapter {
    on(target: unknown, eventName: string, caller: unknown, cb: BlueprintAnyFunc): unknown;
    off(target: unknown, eventName: string, caller: unknown, cb: BlueprintAnyFunc): unknown;
    offAll(target: unknown, eventName: string): unknown;
    emit(target: unknown, eventName: string, args: unknown[]): unknown;
}

export interface BlueprintReflectionAdapter {
    /** Used by `BlueprintDecorator` classification. */
    getNodeCtor?: () => ClassConstructor | null;
    getComponentCtor?: () => ClassConstructor | null;

    /** Used by `ClassUtil.getClassByName` when decoding data. */
    getClassByName?: (name: string) => ClassConstructor | null;

    /** Optional class registry hook (if your host keeps a registry). */
    regClass?: (name: string, ctor: unknown) => void;
    unregClass?: (name: string) => void;
}

export interface BlueprintSerializationAdapter {
    decodeObj?: (value: unknown, target?: object) => unknown;
}

export interface BlueprintRuntimeAdapters {
    events?: BlueprintEventsAdapter;
    reflection?: BlueprintReflectionAdapter;
    serialization?: BlueprintSerializationAdapter;

    /** Main block id passed to `BluePrintMainBlock` constructor. */
    mainId?: string | number;
}

export function createDefaultAdapters(): BlueprintRuntimeAdapters {
    return {
        mainId: 0,
        events: undefined,
        reflection: {},
        serialization: {
            decodeObj: (value) => value,
        },
    };
}
