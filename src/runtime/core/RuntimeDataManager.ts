// Auto-generated from res/y.blueprint.js

import { BlueprintFactory } from "./BlueprintFactory";
import type { BlueprintNode } from "./BlueprintNode";
import { RuntimePinData } from "./RuntimePinData";
import { RuntimeNodeData } from "./RuntimeNodeData";
import { EPinType } from "./BlueprintDefs";

export interface BlueprintVariableSlot {
    name: string;
    value: unknown;
    [key: string]: unknown;
}

export type BlueprintVariableMap = Record<string, BlueprintVariableSlot>;

export class RuntimeDataManager {
    public id: string | number;
    public isInit: boolean | undefined;
    public localVarMap: Map<number, Record<string, unknown>>;
    public localVarObj: Record<string, unknown>;
    public nodeMap: Map<string | number, RuntimeNodeData> | undefined;
    public parmsArray: RuntimePinData[];
    public pinMap: Map<string, RuntimePinData> | undefined;
    constructor(id: string | number) {
        this.id = id;
        this.localVarObj = {};
        this.localVarMap = new Map();
        this.parmsArray = [];
    }

    public saveContextData(from: number, to: number) {
        this.parmsArray.forEach((value) => {
            value.copyValue(from, to);
        });
        let a = this.localVarMap.get(from);
        if (a) {
            this.localVarMap.set(to, Object.create(a));
        }
    }

    private _initGetVarObj(runId: number) {
        let a = this.localVarMap.get(runId);
        if (!a) {
            a = Object.create(this.localVarObj);
            this.localVarMap.set(runId, a);
        }
        return a;
    }

    public clearVar(runId: number) {
        this.localVarMap.delete(runId);
    }

    public getVar(name: string, runId: number) {
        let varObj = this._initGetVarObj(runId);
        return varObj[name];
    }

    public setVar(name: string, value: unknown, runId: number) {
        let varObj = this._initGetVarObj(runId);
        return (varObj[name] = value);
    }

    public getDataById<T extends RuntimeNodeData = RuntimeNodeData>(
        nid: string | number,
    ): T | undefined {
        return this.nodeMap?.get(nid) as T | undefined;
    }

    public getRuntimePinById(id: string): RuntimePinData | undefined {
        return this.pinMap?.get(id);
    }

    public setPinData(pin: { id: string }, value: unknown, runId: number) {
        this.pinMap?.get(pin.id)?.setValue(runId, value);
    }

    public getPinData(pin: { id: string }, runId: number) {
        return this.pinMap?.get(pin.id)?.getValue(runId);
    }

    public initData(
        nodeMap: Map<string | number, BlueprintNode>,
        localVarMap: BlueprintVariableMap | null | undefined,
    ) {
        if (!this.isInit) {
            if (!this.nodeMap) {
                this.nodeMap = new Map();
            }
            if (!this.pinMap) {
                this.pinMap = new Map();
            }
            let dataMap = this.nodeMap;
            let pinMap = this.pinMap;
            nodeMap.forEach((value, key) => {
                if (dataMap.get(key)) {
                    return;
                }
                let cls = BlueprintFactory.getBPContextData(value.type);
                let rdata = new cls();
                dataMap.set(key, rdata);
                value.pins.forEach((pin) => {
                    let pinData = new RuntimePinData();
                    pinData.name = pin.name;
                    if (pin.value != undefined && pin.linkTo.length == 0) {
                        pinData.initValue(pin.value);
                    }
                    if (pinMap.get(pin.id)) {
                        debugger;
                    }
                    pinMap.set(pin.id, pinData);
                    if (pin.type != EPinType.Exec) {
                        this.parmsArray.push(pinData);
                    }
                });
            });
            if (localVarMap) {
                for (let key in localVarMap) {
                    const slot = localVarMap[key];
                    this.localVarObj[slot.name] = slot.value;
                }
            }
            this.isInit = true;
        }
    }
}
