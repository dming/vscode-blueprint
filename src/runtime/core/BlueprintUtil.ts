// Auto-generated from res/y.blueprint.js

import { BlueprintData } from "./BlueprintData";
import { BlueprintFactory } from "./BlueprintFactory";
import { customData, extendsData } from "./BlueprintStores";

/** `[callback, thisArg, extraArgs?]` used by `addCustomData` notifications. */
export type BlueprintFinishCallbackEntry = [
    (this: unknown, ...args: unknown[]) => unknown,
    unknown,
    unknown[]?,
];

export class BlueprintUtil {
    public bpData: BlueprintData;
    public classMap: Record<string, unknown>;
    public customModify: boolean;
    public onfinishCallbacks: Record<string, BlueprintFinishCallbackEntry>;
    public resouceMap: Map<string, unknown>;
    public static CustomClassFinish: string = "CustomClassFinish";
    public static bpData: BlueprintData;
    public static classMap: Record<string, unknown> = {};
    public static customModify: boolean = false;
    public static onfinishCallbacks: Record<string, BlueprintFinishCallbackEntry> = {};
    public static resouceMap: Map<string, unknown> = new Map();
    public static clone<T>(obj: T): T {
        if (null == obj) return obj;
        return JSON.parse(JSON.stringify(obj)) as T;
    }

    public static getConstNode(node: Record<string, unknown>) {
        this.initConstNode();
        return this.bpData.getConstNode(node);
    }

    public static getConstDataById<T = unknown>(target: string, dataId: string): T | null {
        return this.bpData.getConstDataById<T>(target, dataId);
    }

    public static addCustomData(name: string, data: unknown) {
        customData[name] = data;
        BlueprintUtil.customModify = true;
        for (let key in this.onfinishCallbacks) {
            let [fun, caller, args] = this.onfinishCallbacks[key];
            let realArgs = args ? [name, ...args] : [name];
            fun.apply(caller, realArgs);
        }
    }

    public static getDeclaration(name: string) {
        return extendsData[name] ? extendsData[name] : customData[name];
    }

    public static initConstNode() {
        if (null == this.bpData) {
            this.bpData = new BlueprintData(
                extendsData,
                BlueprintFactory.regFunction.bind(BlueprintFactory),
                BlueprintUtil.getClass.bind(BlueprintUtil),
            );
        }
        if (this.customModify) {
            this.bpData.initData(customData);
            this.customModify = false;
        }
    }

    public static getClass(ext: string) {
        return this.classMap[ext];
    }

    public static regClass(name: string, cls: unknown) {
        this.classMap[name] = cls;
    }

    public static regResByUUID(uuid: string, res: unknown) {
        this.resouceMap.set(uuid, res);
    }

    public static getResByUUID(uuid: string) {
        return this.resouceMap.get(uuid);
    }

    public static getNameByUUID(uuid: string) {
        return null;
    }
}
