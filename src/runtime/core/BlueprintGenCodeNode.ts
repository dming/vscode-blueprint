// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "./BlueprintExecuteNode";
import type { BlueprintNode } from "./BlueprintNode";
import type { BlueprintPinRuntime } from "./BlueprintPinRuntime";
import type { BlueprintRuntimeBaseNode } from "./node/BlueprintRuntimeBaseNode";
import { BlueprintRunBase } from "./BlueprintRunBase";
import type { RuntimeDataManager } from "./RuntimeDataManager";

export class BlueprintGenCodeNode extends BlueprintRunBase {
    public blockMap: Map<number, { end: number; code: string }>;
    public codes: string[][];
    public currentFun: string[] | null;
    public listNode: BlueprintRuntimeBaseNode[];
    public vars: Record<string, unknown>;
    constructor() {
        super();
        this.codes = [];
        this.vars = {};
        this.blockMap = new Map();
        this.listNode = [];
        this.currentFun = null;
    }

    public finish(_runtime: BlueprintRunBase) {
        throw new Error("Not implemented");
    }

    public setCacheAble(_node: unknown, _runId: number, _value: unknown) {
        throw new Error("Not implemented");
    }

    public getCacheAble(_node: unknown, _runId: number) {
        throw new Error("Not implemented");
    }

    public getDataManagerByID(_id: string | number) {
        throw new Error("Not implemented");
    }

    public initData(_key: string | number, _nodeMap: Map<string | number, BlueprintNode>) {
        throw new Error("Not implemented");
    }

    public pushBack(_executeNode: BlueprintExecuteNode) {
        throw new Error("Not implemented");
    }

    public getSelf() {
        throw new Error("Not implemented");
    }

    public reCall(_index: unknown) {
        throw new Error("Not implemented");
    }

    public getVar(_name: string) {
        throw new Error("Not implemented");
    }

    public initVar(_name: string, _value: unknown) {}

    public setVar(_name: string, _value: unknown) {
        throw new Error("Not implemented");
    }

    public find(_input: unknown, _outExecutes: unknown) {
        throw new Error("Not implemented");
    }

    public beginExecute(runtimeNode: BlueprintRuntimeBaseNode) {
        const index = this.listNode.indexOf(runtimeNode);
        if (index == -1) {
            this.listNode.push(runtimeNode);
            this.currentFun = [];
            return null;
        } else {
            let code = "while(true){\n";
            for (let i = index; i < this.codes.length; i++) {
                code += this.codes[i].join("\n") + "\n";
            }
            code += "}\n";
            this.blockMap.set(index, { end: this.codes.length - 1, code: code });
            return null;
        }
    }

    public endExecute(_runtimeNode: BlueprintRuntimeBaseNode) {
        if (this.currentFun) {
            this.codes.push(this.currentFun);
            this.currentFun = null;
        }
    }

    public parmFromOtherPin(
        current: BlueprintPinRuntime,
        _runtimeDataMgr: RuntimeDataManager,
        _from: BlueprintPinRuntime,
        parmsArray: unknown[],
        _runId: number,
    ) {
        const popped = this.currentFun!.pop();
        if (popped === undefined) {
            return;
        }
        const last = "let " + current.name + current.owner.nid + " = " + popped;
        this.currentFun!.push(last);
        parmsArray.push(current.name + current.owner.nid);
    }

    public parmFromSelf(
        current: BlueprintPinRuntime,
        _runtimeDataMgr: RuntimeDataManager,
        parmsArray: unknown[],
        _runId: number,
    ) {
        parmsArray.push(current.getValueCode());
    }

    public parmFromOutPut(
        _outPutParmPins: BlueprintPinRuntime[],
        _runtimeDataMgr: RuntimeDataManager,
        _parmsArray: unknown[],
    ) {}

    public parmFromCustom(parmsArray: unknown[], _parm: unknown, parmname: string | number) {
        parmsArray.push(parmname);
    }

    public executeFun(
        nativeFun: { name: string },
        _returnResult: unknown,
        _runtimeDataMgr: RuntimeDataManager,
        _caller: unknown,
        parmsArray: unknown[],
        _runId: number,
    ) {
        const a = nativeFun.name + "(" + parmsArray.join(",") + ");";
        this.currentFun!.push(a);
    }

    public toString() {
        return "context";
    }

    public getCode() {
        let code = "";
        for (let i = 0, n = this.codes.length; i < n; i++) {
            const m = this.blockMap.get(i);
            if (m) {
                code += m.code;
                i = m.end;
            } else {
                code += this.codes[i].join("\n") + "\n";
            }
        }
        return code;
    }
}
