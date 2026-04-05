// Auto-generated from res/y.blueprint.js

import { BlueprintFactory } from "./BlueprintFactory";
import { BlueprintPin } from "./BlueprintPin";
import { BlueprintUtil } from "./BlueprintUtil";
import { EPinDirection, TARGETID } from "./BlueprintDefs";
import { ClassUtil } from "./ClassUtil";
import type { BlueprintPinJson } from "./BlueprintPin";

export type BlueprintPinDefJson = BlueprintPinJson & {
    valueType?: unknown;
    isAsset?: boolean;
    value?: unknown;
    tips?: unknown;
    caption?: unknown;
};

export interface BlueprintNodeDefJson {
    id?: string | number;
    name: string;
    type: string;
    target?: string;
    properties?: BlueprintPinDefJson[];
    output?: BlueprintPinDefJson[];
    [key: string]: unknown;
}

export interface BlueprintNodeRuntimeLinkInfo {
    nodeId: unknown;
    id: string;
}

export interface BlueprintNodeRuntimeOutputSlot {
    infoArr: BlueprintNodeRuntimeLinkInfo[];
    [key: string]: unknown;
}

export interface BlueprintNodeRuntimeJson {
    cid?: string;
    target?: unknown;
    dataId?: unknown;
    inputValue?: Record<string, unknown> | null;
    output?: Record<string, BlueprintNodeRuntimeOutputSlot>;
    [key: string]: unknown;
}

export class BlueprintNode {
    /** Filled in `parse()` before most graph logic runs. */
    public def!: BlueprintNodeDefJson;
    public name: string;
    public nid!: string | number;
    public pins: BlueprintPin[];
    public type!: string;
    constructor() {
        this.pins = [];
    }

    public createPin(def: BlueprintPinDefJson): BlueprintPin {
        const pin = new BlueprintPin();
        pin.parse(def);
        return pin;
    }

    public addPin(pin: BlueprintPin) {
        this.pins.push(pin);
    }

    public parse(def: BlueprintNodeDefJson) {
        const d = def;
        this.def = def;
        this.name = d.name;
        this.setType(d.type);
        let arr = BlueprintFactory.getFunction(
            String(d.id ?? d.name),
            String(d.target ?? "system"),
        );
        this.setFunction(arr ? arr[0] : null, arr ? arr[1] : false);
        if (d.properties) {
            this.addInput(d.properties as any);
        }
        if (d.output) {
            this.addOutput(d.output as any);
        }
    }

    public getPropertyItem(key: string) {
        const arr = (
            this.def as { properties: Array<{ name?: string; id?: string; type?: unknown }> }
        ).properties;
        for (let i = 0, len = arr.length; i < len; i++) {
            const item = arr[i];
            if (item.name == key || item.id == key) {
                return item;
            }
        }
        return null;
    }

    public getValueType(key: string) {
        let arr = (this.def as { properties: Array<Record<string, unknown>> }).properties;
        for (let i = 0, len = arr.length; i < len; i++) {
            let item = arr[i] as any;
            if (item.name == key || item.id == key) {
                if (null == item.valueType) {
                    let type = item.type;
                    if ("string" == typeof type) {
                        if (
                            0 == type.indexOf("new()=>") ||
                            "class" == type ||
                            TARGETID == item.id
                        ) {
                            return "class";
                        } else if (0 == type.indexOf("resource:")) {
                            return "resource";
                        }
                    }
                    if (item.isAsset) {
                        return "resource";
                    }
                }
                return item.valueType;
            }
        }
        return null;
    }

    public isEmptyObj(o: Record<string, unknown>) {
        for (let k in o) {
            return false;
        }
        return true;
    }

    private _checkTarget(node: BlueprintNodeRuntimeJson) {
        const n = node as {
            inputValue?: Record<string, unknown> | null;
            target?: unknown;
        };
        const defName = (this.def as { name?: unknown }).name;
        if (
            typeof defName === "string" &&
            0 == defName.indexOf("static_") &&
            (null == n.inputValue || (null == n.inputValue[TARGETID] && n.target))
        ) {
            let properties = (this.def as { properties?: Array<Record<string, unknown>> })
                .properties;
            if (properties) {
                for (let i = 0, len = properties.length; i < len; i++) {
                    let item = properties[i] as any;
                    if (TARGETID == item.id) {
                        if (null == n.inputValue) {
                            n.inputValue = {};
                        }
                        n.inputValue[TARGETID] = n.target;
                        return;
                    }
                }
            }
        }
    }

    public parseLinkData(node: BlueprintNodeRuntimeJson, manager: unknown) {
        this.onParseLinkData(node, manager);
        this._checkTarget(node);
        const n = node as {
            cid?: unknown;
            target?: unknown;
            dataId?: unknown;
            inputValue?: Record<string, unknown>;
            output?: Record<string, unknown>;
        };
        if (n.inputValue) {
            if (n.cid === "set" && null == n.inputValue.set) {
                const data = BlueprintUtil.getConstDataById<{ type?: unknown }>(
                    String(n.target),
                    String(n.dataId),
                );
                if (data && Array.isArray(data.type)) {
                    n.inputValue.set = [];
                } else {
                    n.inputValue.set = {};
                }
            }
            for (const key in n.inputValue) {
                let pin = this.getPinByName(key);
                if (!pin) {
                    console.error("not find pin " + key);
                    continue;
                }
                if (pin.linkTo.length == 0) {
                    let value = n.inputValue && n.inputValue[key];
                    let valueType = this.getValueType(key);
                    switch (valueType) {
                        case "class":
                            pin.value = BlueprintUtil.getClass(value as string);
                            break;
                        case "resource":
                            pin.value = BlueprintUtil.getResByUUID(value as string);
                            break;
                        default:
                            let result = null;
                            if ("set" === key && n.dataId) {
                                const data = BlueprintUtil.getConstDataById(
                                    String(n.target),
                                    String(n.dataId),
                                );
                                if (data && "string" === typeof (data as any).type) {
                                    const cls = ClassUtil.getClassByName((data as any).type);
                                    if (cls) {
                                        result = ClassUtil.decodeObj(value, new cls());
                                    }
                                }
                            }
                            if (null == result) {
                                result = ClassUtil.decodeObj(value);
                                if (null == result) {
                                    const item = this.getPropertyItem(key);
                                    if (item && "string" === typeof item.type) {
                                        const cls = ClassUtil.getClassByName(item.type);
                                        if (cls) {
                                            result = ClassUtil.decodeObj(value, new cls());
                                        }
                                    }
                                    if (null == result) result = value;
                                }
                            }
                            pin.value = result;
                            break;
                    }
                }
            }
        }
        if (n.output) {
            for (const key in n.output) {
                let pin = this.getPinByName(key);
                if (!pin) {
                    console.error("not find pin " + key);
                    continue;
                }
                let item = n.output[key] as { infoArr: Array<{ nodeId: unknown; id: string }> };
                let infoArr = item.infoArr;
                for (let i = 0, len = infoArr.length; i < len; i++) {
                    let info = infoArr[i];
                    const nextNode = (manager as any).getNodeById?.(info.nodeId) as
                        | BlueprintNode
                        | undefined;
                    if (nextNode) {
                        let pinnext = nextNode.getPinByName(info.id);
                        if (!pinnext) {
                            console.error("not find to pin " + key);
                            continue;
                        }
                        pin.startLinkTo(pinnext);
                    } else {
                        console.error("can't find node ");
                    }
                }
            }
        }
    }

    public onParseLinkData(_node: BlueprintNodeRuntimeJson, _manager: unknown) {}

    public setFunction(fun: ((...args: unknown[]) => unknown) | null, isMember: boolean) {}

    public setType(type: string) {
        this.type = type;
    }

    public addInput(input: BlueprintPinDefJson[]) {
        input.forEach((item) => {
            let pin = this.createPin(item);
            pin.direction = EPinDirection.Input;
            this.addPin(pin);
            pin.id = this.nid + "_" + (this.pins.length - 1);
        });
    }

    public addOutput(output: BlueprintPinDefJson[]) {
        output.forEach((item) => {
            let pin = this.createPin(item);
            pin.direction = EPinDirection.Output;
            this.addPin(pin);
            pin.id = this.nid + "_" + (this.pins.length - 1);
        });
    }

    public getPinByName(id: string) {
        return this.pins.find((pin) => {
            return pin.nid == id;
        });
    }
}
