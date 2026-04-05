// Auto-generated from res/y.blueprint.js

import { BlueprintData } from "./BlueprintData";
import type { BlueprintClassDeclaration } from "./BlueprintDataTypes";
import type {
    BlueprintDynamicSubclassConstructor,
    BlueprintRuntimeBaseConstructor,
} from "./BlueprintFactory";
import { BlueprintFactory } from "./BlueprintFactory";
import { BlueprintUtil } from "./BlueprintUtil";
import { ClassUtil } from "./ClassUtil";
import type { BlueprintAssetJson, BlueprintParsePayload } from "./BlueprintJsonTypes";
import type { BlueprintVariableMap } from "./RuntimeDataManager";

class BlueprintResourceBase {
    public name?: string;
    public addDeps(_deps: unknown[]) {}

    public _disposeResource() {}
}

export class BlueprintResource extends BlueprintResourceBase {
    private _bid: string;
    private _cls: BlueprintDynamicSubclassConstructor | null;
    public allData: Record<string, unknown> | null;
    public allNode: unknown[] | null;
    public data!: BlueprintAssetJson;
    public dec!: BlueprintClassDeclaration;
    public varMap: BlueprintVariableMap | null;

    constructor(bid: string) {
        super();
        this._bid = bid;
        this._cls = null;
        this.allData = null;
        this.allNode = null;
        this.varMap = null;
    }

    public get cls() {
        return this._cls;
    }

    private _initTarget(arr: Array<Record<string, unknown>>, bid: string) {
        for (let i = arr.length - 1; i >= 0; i--) {
            if (null != arr[i].dataId && null == arr[i].target) {
                arr[i].target = bid;
            }
        }
    }

    public initClass(data: BlueprintAssetJson) {
        this.data = data;
        this._cls = null;
        let extendClass = data.extends;
        let runtime = extendClass ? BlueprintUtil.getClass(extendClass) : null;
        if (!runtime) return;
        this._cls = BlueprintFactory.createCls(
            this._bid,
            runtime as BlueprintRuntimeBaseConstructor,
        );
        BlueprintUtil.regClass(this._bid, this.cls);
        let map = data.blueprintArr;
        let arr = (this.allNode = []);
        for (const key in map) {
            let item = map[key];
            arr.push.apply(arr, item.arr);
            this._initTarget(item.arr, this._bid);
        }
        let dataMap = {};
        let varMap = (this.varMap = {} as BlueprintVariableMap);
        let dec = BlueprintData.formatData(data, this.name, dataMap, varMap);
        const componentCtor = ClassUtil.getComponentCtor?.() ?? null;
        if (componentCtor && this.cls.prototype instanceof componentCtor) {
            dec.type = "Component";
        }
        this.dec = dec;
        BlueprintUtil.addCustomData(this._bid, dec);
        this.allData = dataMap;
        BlueprintData.allDataMap.set(this._bid, dataMap);
    }

    public parse() {
        if (this.allData == null || this._cls == null) return;
        const payload: BlueprintParsePayload = {
            id: 0,
            name: this._bid,
            dataMap: this.allData,
            arr: this.allNode as any,
        };
        BlueprintFactory.parseCls(
            this._bid,
            this.data,
            this._cls,
            payload,
            this.data.functions ?? [],
            this.varMap,
            this.data.preload ?? null,
        );
        this.allNode = null;
        this.varMap = null;
    }

    public _disposeResource() {
        super._disposeResource();
        BlueprintFactory.adapters?.reflection?.unregClass?.(this._bid);
    }
}
