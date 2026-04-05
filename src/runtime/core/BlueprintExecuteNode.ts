// Auto-generated from res/y.blueprint.js

import type { BlueprintNode } from "./BlueprintNode";
import { BlueprintPinRuntime } from "./BlueprintPinRuntime";
import { BlueprintRunBase } from "./BlueprintRunBase";
import type { BlueprintRuntimeBaseNode } from "./node/BlueprintRuntimeBaseNode";
import { RuntimeDataManager, type BlueprintVariableMap } from "./RuntimeDataManager";
import type { BluePrintBlock } from "./BluePrintBlock";

export class BlueprintExecuteNode extends BlueprintRunBase {
    public static readonly OWNER_FALLBACK_KEY = "__bp_owner__";
    private _cacheMap: Map<string | number, BlueprintRunCache>;
    public owner: Record<string, unknown>;
    /** Set by debugger / IDE when stepping is paused */
    public debuggerPause?: boolean;
    public readCache: boolean;
    public runtimeDataMgrMap: Map<string | number, RuntimeDataManager>;
    public varDefineMap: Map<string, boolean>;
    public vars: Record<string, unknown>;
    public setCacheAble(node: BlueprintNode, runId: number, value: unknown) {
        let map = this._cacheMap.get(node.nid);
        if (!map) {
            map = new Map();
            this._cacheMap.set(node.nid, map);
        }
        map.set(runId, value);
    }

    public getCacheAble(node: BlueprintNode, runId: number) {
        let _a;
        return (_a = this._cacheMap.get(node.nid)) === null || _a === void 0
            ? void 0
            : _a.get(runId);
    }

    constructor(data: unknown) {
        super();
        this._cacheMap = new Map();
        this.vars = {};
        this.readCache = false;
        this.owner =
            data && typeof data === "object"
                ? (data as Record<string, unknown>)
                : ({ [BlueprintExecuteNode.OWNER_FALLBACK_KEY]: data } as Record<string, unknown>);
        this.varDefineMap = new Map();
        this.runtimeDataMgrMap = new Map();
    }

    public finish(runtime: BlueprintRunBase) {}

    public getDataManagerByID(id: string | number): RuntimeDataManager | undefined {
        return this.runtimeDataMgrMap.get(id);
    }

    public initData(
        key: string | number,
        nodeMap: Map<string | number, BlueprintNode>,
        localVarMap: BlueprintVariableMap | null | undefined,
        parentId?: string | number,
    ) {
        let runtimeDataMgr = this.runtimeDataMgrMap.get(key);
        if (!runtimeDataMgr) {
            let parent = this.runtimeDataMgrMap.get(parentId);
            if (parent) {
                runtimeDataMgr = parent;
            } else {
                runtimeDataMgr = new RuntimeDataManager(key);
                runtimeDataMgr.initData(nodeMap, localVarMap);
            }
            this.runtimeDataMgrMap.set(key, runtimeDataMgr);
        }
    }

    public pushBack(executeNode: unknown, callback: (owner?: unknown) => void) {
        debugger;
    }

    public getSelf(): unknown {
        return this.owner;
    }

    public initVar(name: string, value: unknown) {
        this.vars[name] = value;
        this.varDefineMap.set(name, true);
    }

    public setVar(name: string, value: unknown) {
        let obj = this.varDefineMap.get(name) ? this.vars : this.owner;
        obj[name] = value;
    }

    public getVar(name: string) {
        let obj = this.varDefineMap.get(name) ? this.vars : this.owner;
        return obj[name];
    }

    public getCode() {
        return "";
    }

    public beginExecute(
        runtimeNode: BlueprintRuntimeBaseNode,
        runner: BluePrintBlock,
        enableDebugPause: boolean,
        fromPin: BlueprintPinRuntime | null,
        parmsArray: unknown[],
        prePin: BlueprintPinRuntime | null,
    ): null {
        if (this.listNode.indexOf(runtimeNode) == -1) {
            this.listNode.push(runtimeNode);
            return null;
        } else {
            return null;
        }
    }

    public endExecute(runtimeNode: BlueprintRuntimeBaseNode) {}

    public parmFromCustom(parmsArray: unknown[], parm: unknown, parmname: string | number) {
        parmsArray.push(parm);
    }

    public parmFromOtherPin(
        current: BlueprintPinRuntime,
        runtimeDataMgr: RuntimeDataManager,
        from: BlueprintPinRuntime,
        parmsArray: unknown[],
        runId: number,
    ) {
        parmsArray.push(runtimeDataMgr.getPinData(from, runId));
    }

    public parmFromSelf(
        current: BlueprintPinRuntime,
        runtimeDataMgr: RuntimeDataManager,
        parmsArray: unknown[],
        runId: number,
    ) {
        parmsArray.push(runtimeDataMgr.getPinData(current, runId));
    }

    public parmFromOutPut(
        outPutParmPins: BlueprintPinRuntime[],
        runtimeDataMgr: RuntimeDataManager,
        parmsArray: unknown[],
    ) {
        for (let i = 0, n = outPutParmPins.length; i < n; i++) {
            let out = outPutParmPins[i];
            parmsArray.push(runtimeDataMgr.getRuntimePinById(out.id));
        }
    }

    public executeFun(
        nativeFun: (...args: unknown[]) => unknown,
        returnResult: BlueprintPinRuntime | null,
        runtimeDataMgr: RuntimeDataManager,
        caller: unknown,
        parmsArray: unknown[],
        runId: number,
    ) {
        let result = nativeFun.apply(caller, parmsArray);
        returnResult && runtimeDataMgr.setPinData(returnResult, result, runId);
        return result;
    }

    public reCall(index: unknown) {}
}

type BlueprintRunCache = Map<number, unknown>;
