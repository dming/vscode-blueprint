// Auto-generated from res/y.blueprint.js

import { BlueprintAutoRun } from "./BlueprintAutoRun";
import { BlueprintUtil } from "./BlueprintUtil";
import { RuntimeNodeData } from "./RuntimeNodeData";
import { BPType } from "./BlueprintDefs";
import type { BlueprintNode } from "./BlueprintNode";
import type { BlueprintNodeDefJson } from "./BlueprintNode";
import type { BlueprintRuntimeAdapters } from "./runtime/BlueprintAdapters";
import type {
    BlueprintAssetJson,
    BlueprintFunctionGraphJson,
    BlueprintParsePayload,
} from "./BlueprintJsonTypes";
import type { BlueprintVariableMap } from "./RuntimeDataManager";
import type { BlueprintDataMap } from "./BlueprintJsonTypes";
import type { BlueprintExecuteNode } from "./BlueprintExecuteNode";
import type { BlueprintEventNode } from "./node/BlueprintEventNode";

/**
 * Symbol keys installed by {@link BlueprintFactory.createCls} on generated subclasses.
 * Re-exported so callers can type `instance[sym]` without referencing `BlueprintFactory` only.
 */
export const blueprintBpSymbol = Symbol("bpruntime");
export const blueprintContextSymbol = Symbol("context");
export const blueprintOnChangeSymbol = Symbol("onChange");
export const blueprintAutoRunSymbol = Symbol("autoRun");

/** Registered runtime class constructor (not always a graph `BlueprintNode`). */
export type BlueprintNodeConstructor = new (...args: unknown[]) => unknown;

/** Graph node constructor used by `createNew` and `_bpMap`. */
export type BlueprintGraphNodeConstructor = new () => BlueprintNode;

/** Context data constructor used by `RuntimeDataManager`. */
export type BlueprintContextDataConstructor = new () => RuntimeNodeData;

/**
 * Base host class passed to {@link BlueprintFactory.createCls}.
 * Must return a non-primitive instance (extendable reference type), not `null` / primitives.
 */
export type BlueprintRuntimeBaseConstructor = new (...args: unknown[]) => object;

/** Looks up serialized const / decoded node data while linking the graph. */
export type BlueprintConstNodeResolver = (item: Record<string, unknown>) => unknown;

/** Static execute context attached to generated classes (`contextSymbol`). */
export interface BlueprintGeneratedStaticContext {
    initVar(name: string, value: unknown): void;
    getVar(name: string): unknown;
    setVar(name: string, value: unknown): void;
}

/**
 * Runtime instance held on generated class prototype (`bpSymbol`) during
 * {@link BlueprintFactory.parseCls}; aligns with {@link BlueprintRuntime} parse entrypoints.
 */
export interface BlueprintClassParseRuntime {
    dataMap?: BlueprintDataMap;
    varMap?: BlueprintVariableMap | null;
    isRunningInIDE?: unknown;
    parse(
        data: BlueprintParsePayload,
        getCNodeByNode: BlueprintConstNodeResolver,
        varMap: BlueprintVariableMap | null,
        newCls: BlueprintNodeConstructor,
    ): void;
    parseFunction(
        fun: BlueprintFunctionGraphJson,
        getCNodeByNode: BlueprintConstNodeResolver,
    ): void;
}

/**
 * Constructor assigned to {@link BlueprintFactory.BPRuntimeCls}; `new` result is stored at
 * `prototype[bpSymbol]` and must implement {@link BlueprintClassParseRuntime}.
 */
export type BlueprintClassParseRuntimeConstructor = new (
    ...args: unknown[]
) => BlueprintClassParseRuntime;

/**
 * Blueprint object on `prototype[blueprintBpSymbol]` for generated subclasses (e.g. default
 * {@link BlueprintRuntime}): parse API plus `mainBlock` / `run` used by injected class bodies.
 */
export type BlueprintSubclassBpRuntime = BlueprintClassParseRuntime & {
    mainBlock: {
        autoAnonymousfuns: BlueprintEventNode[];
        runAuto(context: BlueprintExecuteNode): void;
    };
    run(
        context: BlueprintExecuteNode,
        event: BlueprintEventNode | null,
        parms: unknown[] | null,
        cb: (() => void) | null,
    ): void;
};

/** Static slot on the generated constructor (`cls[contextSymbol]` before instances exist). */
export type BlueprintGeneratedConstructorSymbols = {
    [blueprintContextSymbol]: BlueprintGeneratedStaticContext;
};

/** Prototype slots written in {@link BlueprintFactory.createCls}. */
export type BlueprintGeneratedPrototypeSymbols = {
    [blueprintBpSymbol]: BlueprintSubclassBpRuntime;
    [blueprintAutoRunSymbol]: () => void;
};

/**
 * Per-instance symbol fields set by the generated subclass constructor body.
 * `bpSymbol` is stored on the prototype but is readable on instances.
 */
export type BlueprintGeneratedInstanceSymbols = {
    [blueprintContextSymbol]: BlueprintExecuteNode;
    [blueprintBpSymbol]: BlueprintSubclassBpRuntime;
};

/**
 * Constructor returned from {@link BlueprintFactory.createCls}
 * (`_$loadable`, {@link blueprintContextSymbol}, {@link blueprintBpSymbol}, {@link blueprintAutoRunSymbol}, etc.).
 */
export type BlueprintDynamicSubclassConstructor<
    C extends BlueprintRuntimeBaseConstructor = BlueprintRuntimeBaseConstructor,
> = (new (
    ...args: ConstructorParameters<C>
) => InstanceType<C> & BlueprintGeneratedInstanceSymbols) &
    BlueprintGeneratedConstructorSymbols & {
        prototype: InstanceType<C> & BlueprintGeneratedPrototypeSymbols;
        _$loadable?: boolean;
    };

export class BlueprintFactory {
    public _bpContextMap: Map<string, BlueprintContextDataConstructor>;
    public _bpMap: Map<string, BlueprintGraphNodeConstructor>;
    private _bp_data: Record<string, unknown>;
    public _funMap: Map<string, [(...args: unknown[]) => unknown, boolean]>;
    private _instance: BlueprintFactory | undefined;
    public on: (...args: unknown[]) => unknown;
    public runInEditor: unknown;
    public static _bpContextMap: Map<string, BlueprintContextDataConstructor> = new Map();
    public static _bpMap: Map<string, BlueprintGraphNodeConstructor> = new Map();
    public static _funMap: Map<string, [(...args: unknown[]) => unknown, boolean]> = new Map();
    public static bpNewMap: Map<string, unknown> = new Map();
    private static _instance: BlueprintFactory | undefined;
    public static readonly bpSymbol = blueprintBpSymbol;
    public static readonly contextSymbol = blueprintContextSymbol;
    public static readonly onChangeSymbol = blueprintOnChangeSymbol;
    public static readonly autoRunSymbol = blueprintAutoRunSymbol;
    public static BPExecuteCls: BlueprintNodeConstructor;
    public static BPRuntimeCls: BlueprintClassParseRuntimeConstructor;
    public static adapters: BlueprintRuntimeAdapters | null = null;

    public static setAdapters(adapters: BlueprintRuntimeAdapters | null) {
        this.adapters = adapters;
    }

    public static regBPClass(type: string, cls: BlueprintGraphNodeConstructor) {
        this._bpMap.set(type, cls);
    }

    public static regFunction(
        fname: string,
        fun: ((...args: unknown[]) => unknown) | null,
        isMember = false,
        cls: object | null = null,
        target = "system",
    ) {
        if (isMember == false && cls && fun) {
            fun = fun.bind(cls);
        }
        this._funMap.set(fname + "_" + target, [fun, isMember]);
    }

    public static getFunction(fname: string, target: string) {
        return this._funMap.get(fname + "_" + target);
    }

    public static regBPContextData(type: string, cls: BlueprintContextDataConstructor) {
        this._bpContextMap.set(type, cls);
    }

    public static getBPContextData(type: string): BlueprintContextDataConstructor {
        return this._bpContextMap.get(type) || RuntimeNodeData;
    }

    public static createCls<C extends BlueprintRuntimeBaseConstructor>(
        name: string,
        cls: C,
    ): BlueprintDynamicSubclassConstructor<C> {
        function classFactory<C extends BlueprintRuntimeBaseConstructor>(
            className: string,
            SuperClass: C,
        ): BlueprintDynamicSubclassConstructor<C> {
            // Host base can be anything extendable; keep `extends` loose so generated body can assign dynamic fields.
            const Base = SuperClass as new (...args: unknown[]) => any;
            return {
                [className]: class extends Base {
                    constructor(...args: ConstructorParameters<C>) {
                        let _a;
                        super(...args);
                        const bpThis = this as InstanceType<C> & BlueprintGeneratedInstanceSymbols;
                        const adapters = BlueprintFactory.adapters;
                        if (adapters?.events) {
                            // Provide event methods if host didn't supply them on SuperClass.
                            const self: any = this;
                            if (typeof self.on !== "function") {
                                self.on = function (eventName: string, caller: unknown, cb: any) {
                                    return adapters.events!.on(self, eventName, caller, cb);
                                };
                            }
                            if (typeof self.off !== "function") {
                                self.off = function (eventName: string, caller: unknown, cb: any) {
                                    return adapters.events!.off(self, eventName, caller, cb);
                                };
                            }
                            if (typeof self.offAll !== "function") {
                                self.offAll = function (eventName: string) {
                                    return adapters.events!.offAll(self, eventName);
                                };
                            }
                            if (typeof self.event !== "function") {
                                self.event = function (eventName: string, args: unknown[]) {
                                    return adapters.events!.emit(self, eventName, args);
                                };
                            }
                        }
                        const ctx = new BlueprintFactory.BPExecuteCls(this) as unknown as {
                            initVar(name: string, value: unknown): void;
                            getVar(name: string): unknown;
                            setVar(name: string, value: unknown): void;
                        };
                        bpThis[blueprintContextSymbol] = ctx as unknown as BlueprintExecuteNode;
                        this._bp_data = {};
                        let varMap = bpThis[blueprintBpSymbol].varMap;
                        if (bpThis[blueprintBpSymbol].isRunningInIDE) {
                            this.runInEditor = true;
                        }
                        if (varMap) {
                            for (let key in varMap) {
                                let v = varMap[key];
                                if (
                                    !((_a = v.modifiers) === null || _a === void 0
                                        ? void 0
                                        : _a.isStatic)
                                ) {
                                    ctx.initVar(v.name, v.value);
                                    let _this = this;
                                    Object.defineProperty(this._bp_data, v.name, {
                                        enumerable: true,
                                        configurable: false,
                                        get: function () {
                                            return ctx.getVar(v.name);
                                        },
                                        set: function (value) {
                                            ctx.setVar(v.name, value);
                                            BlueprintFactory.onPropertyChanged_EM(_this);
                                        },
                                    });
                                }
                            }
                        }
                        this._bp_init_();
                    }

                    onPropertyChanged_EM() {}

                    _bp_init_() {
                        const bpThis = this as InstanceType<C> & BlueprintGeneratedInstanceSymbols;
                        let autoRegs = bpThis[blueprintBpSymbol].mainBlock.autoAnonymousfuns;
                        if (autoRegs) {
                            let _this = bpThis;
                            autoRegs.forEach((value) => {
                                this.on(value.eventName, this, function () {
                                    _this[blueprintBpSymbol].run(
                                        _this[blueprintContextSymbol],
                                        value,
                                        Array.from(arguments),
                                        null,
                                    );
                                });
                            });
                            // no-op placeholder from generated source
                        }
                    }

                    [blueprintAutoRunSymbol]() {
                        const bpThis = this as InstanceType<C> & BlueprintGeneratedInstanceSymbols;
                        bpThis[blueprintBpSymbol].mainBlock.runAuto(
                            bpThis[blueprintContextSymbol],
                        );
                    }
                },
            }[className] as unknown as BlueprintDynamicSubclassConstructor<C>;
        }
        const newClass = classFactory(name, cls);
        Object.defineProperty(newClass, "name", { value: name });
        // `BPExecuteCls` is generated/runtime-provided; keep it loose.
        newClass[BlueprintFactory.contextSymbol] = new BlueprintFactory.BPExecuteCls(
            newClass,
        ) as unknown;
        newClass._$loadable = true;
        newClass.prototype[BlueprintFactory.bpSymbol] = new BlueprintFactory.BPRuntimeCls();
        return newClass as BlueprintDynamicSubclassConstructor<C>;
    }

    public static parseCls(
        name: string,
        saveData: BlueprintAssetJson,
        newClass: BlueprintDynamicSubclassConstructor,
        data: BlueprintParsePayload,
        funs: readonly BlueprintFunctionGraphJson[],
        varMap: BlueprintVariableMap | null,
        preload: readonly string[] | null,
    ): void {
        let _a, _b;
        const staticContext = newClass[
            BlueprintFactory.contextSymbol
        ] as BlueprintGeneratedStaticContext;
        if (varMap) {
            for (const str in varMap) {
                const v = varMap[str];
                if ((_a = v.modifiers) === null || _a === void 0 ? void 0 : _a.isStatic) {
                    staticContext.initVar(v.name, v.value);
                }
            }
        }
        const bp = newClass.prototype[BlueprintFactory.bpSymbol] as BlueprintClassParseRuntime;
        bp.dataMap = data.dataMap;
        const c: BlueprintConstNodeResolver = (node) => {
            const ret = BlueprintUtil.getConstNode(node);
            if (null == ret && preload && node.target && !preload.includes(node.target as string)) {
                console.warn(`Missing blueprint data: ${node.target} ${node.cid ?? ""}`);
            }
            return ret;
        };
        bp.varMap = varMap;
        bp.isRunningInIDE =
            (_b = saveData.globalInfo) === null || _b === void 0 ? void 0 : _b.isRunningInIDE;
        bp.parse(data, c, varMap, newClass);
        for (const fun of funs) {
            bp.parseFunction(fun, c);
        }
        this.initClassHook(name, newClass);
    }

    public static createClsNew(
        name: string,
        saveData: BlueprintAssetJson,
        cls: BlueprintRuntimeBaseConstructor,
        data: BlueprintParsePayload,
        funs: readonly BlueprintFunctionGraphJson[],
        varMap: BlueprintVariableMap | null,
    ) {
        let newClass = this.createCls(name, cls);
        this.parseCls(name, saveData, newClass, data, funs, varMap, null);
        return newClass;
    }

    public static initClassHook(parent: string, cls: BlueprintDynamicSubclassConstructor) {}

    public static onPropertyChanged_EM(bp: unknown) {}

    public static get instance() {
        if (!this._instance) {
            this._instance = new BlueprintFactory();
        }
        return this._instance;
    }

    public createNew(config: BlueprintNodeDefJson, item: BlueprintGraphItemJson) {
        let _a;
        const c = config as { modifiers?: { isAutoRun?: boolean }; type?: string };
        let isAutoRun = (_a = c.modifiers) === null || _a === void 0 ? void 0 : _a.isAutoRun;
        let cls =
            BlueprintFactory._bpMap.get(String(c.type)) || BlueprintFactory._bpMap.get(BPType.Pure);
        if (isAutoRun) {
            cls = BlueprintAutoRun as unknown as BlueprintGraphNodeConstructor;
        }
        const result = new cls() as BlueprintNode & {
            autoReg?: unknown;
            _testItem?: unknown;
            _testConfig?: unknown;
        };
        result.nid = item.id as string | number;
        if (item.autoReg) result.autoReg = item.autoReg;
        result.parse(config);
        result._testItem = item;
        result._testConfig = config;
        return result;
    }
}

export interface BlueprintGraphItemJson {
    id?: string | number;
    autoReg?: unknown;
    dataId?: unknown;
    target?: unknown;
    cid?: string;
    [key: string]: unknown;
}
