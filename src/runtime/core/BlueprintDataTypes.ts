import type { BPType } from "./BlueprintDefs";

/** One target bucket in `BlueprintData.constData` */
export interface BlueprintConstBucket {
    data: Record<string, unknown>;
    extends?: string;
    caption?: string;
}

/** Class field / variable line produced by `BlueprintData.formatData` → `dec.props` */
export interface BlueprintDeclarationProp {
    name: string;
    tips?: string;
    caption?: string;
    type?: string;
    customId?: string;
    modifiers?: Record<string, unknown>;
    value?: unknown;
    /** Filled in `_createConstData` */
    id?: string;
    const?: boolean;
    target?: string;
    bpType?: string;
}

/** Parameter or return slot on a formatted function */
export interface BlueprintDeclarationParam {
    name?: string;
    tips?: string;
    caption?: string;
    type?: string;
    id?: string;
}

/** Function line produced by `BlueprintData.formatData` → `dec.funcs` */
export interface BlueprintDeclarationFunction {
    name: string;
    tips?: string;
    caption?: string;
    type: string;
    customId?: string;
    params: BlueprintDeclarationParam[];
    modifiers: Record<string, unknown>;
    /** `"void"` or tuple of return pins parsed from graph outputs */
    returnType: string | BlueprintDeclarationParam[];
}

/** Pin / port item from editor JSON (arbitrary `type` labels). */
export interface BlueprintIoDef {
    name?: string;
    type?: string;
    id?: string;
    caption?: string;
}

/** Pin `type` labels used by `BlueprintDataList` builtins (subset of editor labels). */
export type BlueprintBuiltinPinType =
    | "any"
    | "array"
    | "boolean"
    | "bpFun"
    | "class"
    | "exec"
    | "new()=>T"
    | "number"
    | "object"
    | "string"
    | "T";

/** Event entry merged into `dec.events` from asset JSON */
export interface BlueprintDeclarationEvent {
    id?: string;
    name?: string;
    params?: unknown[];
    properties?: BlueprintIoDef[];
    [key: string]: unknown;
}

/** Declaration object produced by `BlueprintData.formatData` */
export interface BlueprintClassDeclaration {
    name: string;
    type?: string;
    props: BlueprintDeclarationProp[];
    funcs: BlueprintDeclarationFunction[];
    events: BlueprintDeclarationEvent[];
    extends?: string;
}

/**
 * Native / static function registered with {@link BlueprintFactory.regFunction}.
 * Method-style alias so implementations with concrete parameter lists remain assignable
 * (same idea as React’s `bivarianceHack` for callbacks — no `any[]`).
 */
export type BlueprintNativeCallable = {
    __blueprintCallable(...args: unknown[]): unknown | void;
}['__blueprintCallable'];

export type BlueprintRegFunction = (
    fname: string,
    fun: (BlueprintNativeCallable | null),
    isMember?: boolean,
    cls?: object | null,
    target?: string,
) => void;

export type BlueprintGetClass = (ext: string) => unknown;

/**
 * Pin / port item inside a builtin node definition (`properties` / `output` arrays).
 * Static list labels are documented by {@link BlueprintBuiltinPinType}; `initBlock` may
 * rewrite `type` at runtime (`BlueprintData.formatType`), so this stays `string`.
 */
export type BlueprintBuiltinIoDef = BlueprintIoDef;

/** Minimal shape for builtin entries in `BlueprintDataList` */
export interface BlueprintBuiltinEntry {
    name?: string;
    id?: string;
    menuPath?: string;
    type?: BPType | string;
    bpType?: string;
    target?: string;
    modifiers?: Record<string, unknown>;
    properties?: BlueprintBuiltinIoDef[];
    output?: BlueprintBuiltinIoDef[];
    caption?: string;
    isSelf?: boolean;
    typeParameters?: unknown;
}
