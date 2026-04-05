// Auto-generated from res/y.blueprint.js

import { BPType, EXECID, TARGETID } from "./BlueprintDefs";
import { BlueprintDataList } from "./BlueprintDataList";
import type {
    BlueprintClassDeclaration,
    BlueprintConstBucket,
    BlueprintGetClass,
    BlueprintRegFunction,
} from "./BlueprintDataTypes";
import type { BlueprintAssetJson } from "./BlueprintJsonTypes";

export class BlueprintData {
    private _extendsData: Record<string, unknown>;
    private _getClass: BlueprintGetClass | null;
    private _regFunction: BlueprintRegFunction | null;
    public autoCreateData: Record<string, unknown>;
    public constData: Record<string, BlueprintConstBucket>;
    public getConstDataExt: ((target: string, dataId: string) => unknown) | undefined;
    public isResetData: boolean;
    public isStartCatch: boolean;
    public static allDataMap: Map<string, Record<string, unknown>> = new Map();
    public static defFunOut: { name: string; type: string; id: string } = {
        name: "then",
        type: "exec",
        id: "out_" + EXECID,
    };
    public static defFunIn: { name: string; caption: string; type: string; id: string } = {
        name: EXECID,
        caption: "execute",
        type: "exec",
        id: EXECID,
    };
    public static defTarget: { name: string; caption: string; type: string; id: string } = {
        name: TARGETID,
        caption: "target",
        type: "any",
        id: TARGETID,
    };
    public static defEventOut: { name: string; type: string; id: string } = BlueprintData.defFunOut;
    public static funlike: BPType[] = [BPType.Function, BPType.CustomFun, BPType.Pure];
    public static checklike: BPType[] = [BPType.Pure, BPType.Function, BPType.Event];
    public static formatName(param: { name: string; dotdotdot?: boolean }): string {
        let name = param.name;
        if (param.dotdotdot) {
            if (!name.startsWith("...")) {
                name = "..." + name;
            }
        }
        return name;
    }

    public static formatType(type: unknown): unknown {
        if (type && "string" == typeof type) {
            if ("array" == type) return ["any"];
            let index = type.indexOf("<");
            if (0 < index) {
                let key = type.substring(0, index);
                let value = type.substring(index + 1, type.lastIndexOf(">"));
                if ("Array" == key.trim()) {
                    return [this.formatType(value)];
                } else if ("Record" == key.trim()) {
                    return ["Record", this.formatType(value)];
                }
            }
            index = type.indexOf("[]");
            if (0 <= index && type.indexOf("new(") < 0) {
                return [type.substring(0, index)];
            }
        }
        return type;
    }

    constructor(
        extendsData: Record<string, unknown>,
        regFunction: BlueprintRegFunction | null = null,
        getClass: BlueprintGetClass | null = null,
    ) {
        this.constData = {};
        this.autoCreateData = {};
        this.isStartCatch = true;
        this.isResetData = false;
        this._extendsData = extendsData;
        this._regFunction = regFunction;
        this._getClass = getClass;
        let list = BlueprintDataList;
        for (let i = list.length - 1; i >= 0; i--) {
            let o = list[i];
            if (null == o) continue;
            if (null == o.id) o.id = o.name;
            if (null == o.bpType) o.bpType = "function";
            if (null == o.target) o.target = "system";
            if (null == this.constData[o.target]) this.constData[o.target] = { data: {} };
            this.constData[o.target].data[o.id] = o;
            let input = o.properties;
            if (input) {
                for (let i = input.length - 1; i >= 0; i--) {
                    let o = input[i];
                    o.type = BlueprintData.formatType(o.type) as string;
                    if (null == o.name) {
                        o.name = String.fromCharCode(97 + i);
                    } else if ("execute" == o.name && "exec" == o.type && null == o.id) {
                        o.id = EXECID;
                        o.caption = "execute";
                        o.name = EXECID;
                    } else if ("target" == o.name && null == o.id) {
                        o.caption = "target";
                        o.name = TARGETID;
                        o.id = TARGETID;
                    }
                }
            }
            if (BPType.Function == o.type) {
                if (input) {
                    if (null == o.modifiers || !o.modifiers.isStatic) {
                        input.unshift(BlueprintData.defTarget);
                    }
                    input.unshift(BlueprintData.defFunIn);
                } else {
                    input = [BlueprintData.defFunIn];
                    if (null == o.modifiers || !o.modifiers.isStatic) {
                        input.push(BlueprintData.defTarget);
                    }
                    o.properties = input;
                }
            }
            let output = o.output;
            if (output) {
                for (let i = output.length - 1; i >= 0; i--) {
                    let o = output[i];
                    o.type = BlueprintData.formatType(o.type) as string;
                    if ("then" == o.name && "exec" == o.type && null == o.id) {
                        o.id = "out_" + EXECID;
                    } else if (null == o.name) {
                        if (0 == i) {
                            o.name = "return";
                        } else {
                            throw "output插槽必须要有name！";
                        }
                    }
                }
            }
            if (BPType.Function == o.type) {
                if (output) {
                    output.unshift(BlueprintData.defFunOut);
                } else {
                    output = [BlueprintData.defFunOut];
                    o.output = output;
                }
            }
        }
        this.initData(extendsData);
    }

    public get extendsData() {
        return this._extendsData;
    }

    public getExtends(ext: string, arr: string[] | null): string[] | null {
        if (null == ext) return null;
        if (null == arr) arr = [ext];
        else {
            arr.push(ext);
        }
        let o = this._extendsData[ext];
        if (null != o) this.getExtends((o as { extends?: string }).extends as string, arr);
        return arr;
    }

    public getConstDataById<T = unknown>(target: string, dataId: string): T | null {
        if (null != this.getConstDataExt) {
            let ret = this.getConstDataExt(target, dataId) as T | null;
            if (null != ret) return ret;
        }
        let targetData = this.constData[target];
        if (targetData) {
            return targetData.data[dataId] as T;
        }
        return null;
    }

    private _getConstData(cid, target?) {
        if (("construct" == cid || cid.startsWith("construct_")) && target) {
            cid = "construct_" + target;
        }
        if (null == cid) return null;
        if (null == target) target = "system";
        let targetData = this.constData[target];
        if (targetData) {
            let ret = targetData.data[cid];
            if (null == ret && "system" != target) {
                return this._getConstData(cid);
            }
            return ret;
        } else if ("system" != target) {
            return this._getConstData(cid);
        }
        return null;
    }

    public static clone<T>(obj: T): T {
        if (null == obj) return obj;
        return JSON.parse(JSON.stringify(obj)) as T;
    }

    private _getConstByNode(node: Record<string, unknown>) {
        const n = node as {
            dataId?: string;
            cid?: string;
            target?: string;
        };
        if (null != n.dataId) {
            let id = n.cid + "_" + n.dataId + "_" + n.target;
            if (this.isStartCatch && null != this.autoCreateData[id])
                return this.autoCreateData[id];
            let cdata = this._getConstData(n.cid, n.target);
            if (
                "static_get" == n.cid ||
                "static_set" == n.cid ||
                "get" == n.cid ||
                "set" == n.cid ||
                "tmp_get" == n.cid ||
                "tmp_set" == n.cid
            )
                return cdata;
            let data = null;
            if (null == data) {
                let obj = BlueprintData.allDataMap.get(n.target);
                if (obj) {
                    data = obj[n.dataId];
                    if (!data) {
                        let dataId = n.dataId;
                        let findIndex = dataId.lastIndexOf("_");
                        if (findIndex === dataId.length - 1) {
                            dataId = dataId.substring(0, findIndex);
                            data = obj[dataId];
                            if (data) {
                                n.dataId = dataId;
                            }
                        }
                    }
                }
            }
            if (null == data) {
                data = this.getConstDataById(n.target, n.dataId);
            }
            if (data) {
                cdata = BlueprintData.clone(cdata);
                cdata._isClone = true;
                let arr = data.properties;
                if (BPType.CustomFunReturn != cdata.type) {
                    if (arr) {
                        for (let i = 0, len = arr.length; i < len; i++) {
                            if (null == arr[i].name || "" == arr[i].name.trim()) {
                                if (null != arr[i].caption && "" != arr[i].caption.trim()) {
                                    console.log(
                                        "数据异常，应该是属性面板增加了这个属性，但是没有自动创建数据的id号，出现原因不明，有可能是数据回退造成的，待查！",
                                    );
                                }
                                continue;
                            }
                            if (BPType.Event == cdata.type || BPType.CustomFunStart == cdata.type) {
                                if (null == cdata.output) cdata.output = [];
                                this._checkAndPush(cdata.output, arr[i]);
                            } else {
                                if (null == cdata.properties) cdata.properties = [];
                                this._checkAndPush(cdata.properties, arr[i]);
                            }
                        }
                    }
                }
                if (
                    BPType.CustomFunStart != cdata.type &&
                    BPType.Event != cdata.type &&
                    "event_call" != cdata.name
                ) {
                    let arr = data.output;
                    if (arr) {
                        for (let i = 0, len = arr.length; i < len; i++) {
                            if (null == arr[i].name || "" == arr[i].name.trim()) continue;
                            if (BPType.CustomFunReturn == cdata.type) {
                                if (null == cdata.properties) cdata.properties = [];
                                this._checkAndPush(cdata.properties, arr[i]);
                            } else {
                                if (null == cdata.output) cdata.output = [];
                                this._checkAndPush(cdata.output, arr[i]);
                            }
                        }
                    }
                }
                this.autoCreateData[id] = cdata;
                return cdata;
            }
        } else {
            return this._getConstData(node.cid, node.target);
        }
        return null;
    }

    public getConstNode(node: Record<string, unknown>) {
        const n = node as {
            properties?: Array<Record<string, any>>;
            outputs?: Array<Record<string, any>>;
        };
        let ret = this._getConstByNode(node);
        if ((ret && n.properties) || n.outputs) {
            if (!ret._isClone) {
                ret = BlueprintData.clone(ret);
                ret._isClone = true;
            }
            if (n.properties) {
                let last = ret.properties.pop();
                let name = last.name.substring(3);
                for (let i = 0, len = n.properties.length; i < len; i++) {
                    let o = n.properties[i];
                    o.caption = name + "_" + (i + 1);
                }
                ret.properties.push(...n.properties);
                ret.properties.push(last);
            }
            if (n.outputs) {
                let last = ret.output.pop();
                ret.output.push(...n.outputs);
                ret.output.push(last);
            }
        }
        return ret;
    }

    private _checkAndPush(arr: Array<{ name: string }>, obj: { name: string }) {
        for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i].name == obj.name) return;
        }
        arr.push(obj);
    }

    private _checkOverrideProp(
        o: Record<string, Array<{ name: string }> | undefined>,
        overObj: Record<string, Array<{ name: string }> | undefined>,
        property: string,
        ext: string,
    ) {
        let arr = o[property];
        const overArr = overObj[property];
        if (overArr) {
            if (null == arr) {
                arr = [];
                o[property] = arr;
            }
            for (let i = overArr.length; i--; ) {
                const item = overArr[i];
                let isFind = false;
                for (let j = arr.length; j--; ) {
                    if (arr[j].name == item.name) {
                        isFind = true;
                        break;
                    }
                }
                if (!isFind) {
                    arr.push(Object.assign({}, item, { target: ext }));
                }
            }
        }
    }

    private _initObject(o: Record<string, unknown>, ext: string, data: Record<string, unknown>) {
        if (!ext) return;
        const extObj = data[ext] as unknown as { extends?: string } | null | undefined;
        if (extObj) {
            const base = o as unknown as Record<string, Array<{ name: string }> | undefined>;
            const over = extObj as unknown as Record<string, Array<{ name: string }> | undefined>;
            this._checkOverrideProp(base, over, "funcs", ext);
            this._checkOverrideProp(base, over, "props", ext);
            this._checkOverrideProp(base, over, "events", ext);
            this._initObject(o, extObj.extends ?? "", data);
        }
    }

    private _createExtData(data: Record<string, unknown>, ext: string, cls: unknown) {
        if (this._getClass) {
            cls = this._getClass(ext);
        }
        let co = this.constData[ext];
        if (null != co) return co;
        let o = data[ext] as any;
        if (null == o) {
            let eo = this._extendsData[ext];
            const eoe = eo as { extends?: string } | null | undefined;
            if (null != eoe && null != eoe.extends) {
                let ret = this._createExtData(data, eoe.extends, cls);
                co = { data: Object.create(ret.data) };
                co.extends = eoe.extends;
                this.constData[ext] = co;
            } else {
                this.constData[ext] = { data: {} };
            }
            return this.constData[ext];
        } else {
            this._initObject(o, ext, data);
        }
        let exts = (o as { extends?: string } | null | undefined)?.extends;
        if (exts) {
            let ret = this._createExtData(data, exts, cls);
            co = { data: Object.create(ret.data) };
            co.extends = exts;
            this._createConstData(o, co, ext, cls);
        } else {
            co = { data: {} };
            this._createConstData(o, co, ext, cls);
        }
        if ((o as { name?: string } | null | undefined)?.name != ext) co.caption = (o as any).name;
        if (null != (o as any).caption) co.caption = (o as any).caption;
        this.constData[ext] = co;
        return co;
    }

    private _createConstData(
        o: Record<string, unknown>,
        cdata: BlueprintConstBucket,
        ext: string,
        cls: unknown,
    ) {
        const obj = o as any;
        if (obj === null || obj === void 0 ? void 0 : obj.props) {
            obj.props.forEach((po) => {
                po.id = "var_" + po.name;
                if (null != po.customId) {
                    po.id = po.customId;
                } else if (po.modifiers && po.modifiers.isStatic) {
                    po.id += "_static";
                }
                po.const = true;
                po.target = ext;
                po.bpType = "prop";
                cdata.data[po.id] = po;
            });
        }
        if (obj && "Interface" === obj.type && (!obj.funcs || 0 === obj.funcs.length)) {
            obj.construct = {
                params: obj.props,
            };
        }
        if (!obj.construct) {
            obj.construct = {
                params: [],
            };
        }
        if (obj === null || obj === void 0 ? void 0 : obj.construct) {
            let po = {
                name: ext,
                target: ext,
                menuPath: "createNew",
                id: "construct_" + ext,
                bpType: "construct",
                type: BPType.NewTarget,
                properties: [],
                output: [{ name: "return", type: ext }],
            };
            cdata.data[po.id] = po;
            if (obj.construct.params) {
                po.properties = obj.construct.params.map((param) => ({
                    name: BlueprintData.formatName(param),
                    type: BlueprintData.formatType(param.type),
                }));
            }
            for (let k in obj.construct) {
                if ("params" != k && null == po[k]) {
                    po[k] = obj.construct[k];
                }
            }
        }
        if (obj === null || obj === void 0 ? void 0 : obj.events) {
            obj.events.forEach((eve) => {
                if (null == eve.id) {
                    eve.id = "event_" + eve.name;
                }
                if (null != eve.customId) {
                    eve.id = eve.customId;
                }
                eve.bpType = "event";
                eve.target = ext;
                if (null == eve.properties && null != eve.params) {
                    eve.properties = eve.params;
                }
                cdata.data[eve.id] = eve;
            });
        }
        if (obj === null || obj === void 0 ? void 0 : obj.funcs) {
            obj.funcs.forEach((fun) => {
                let modifiers = fun.modifiers;
                if (!modifiers) modifiers = fun.modifiers = {};
                if (modifiers.isPublic == null || modifiers.isPublic || modifiers.isProtected) {
                    let po = BlueprintData.createCData(fun) as any;
                    po.target = ext;
                    po.isAsync = fun.returnType && fun.returnType.indexOf("Promise<") !== -1;
                    if (this._regFunction && cls != null) {
                        const host = cls as Record<string, unknown> & {
                            prototype: Record<string, unknown>;
                        };
                        const fn = modifiers.isStatic ? host[fun.name] : host.prototype[fun.name];
                        this._regFunction(
                            po.id,
                            fn as (...args: unknown[]) => unknown,
                            !modifiers.isStatic,
                            cls as object,
                            po.target,
                        );
                    }
                    if (fun.params && fun.params.length > 0) {
                        let params = fun.params;
                        for (let i = params.length - 1; i >= 0; i--) {
                            params[i].name = BlueprintData.formatName(params[i]);
                        }
                        if (BPType.Event == po.type) {
                            po.output.push(...fun.params);
                        } else {
                            po.properties = [...fun.params];
                        }
                    }
                    BlueprintData.handleCDataTypes(po, fun, ext);
                    for (let k in fun) {
                        if (null == po[k]) {
                            po[k] = fun[k];
                        }
                    }
                    cdata.data[po.id] = po;
                    cdata.data[po.oldId] = po;
                }
            });
        }
        const system = this.constData["system"];
        if (system && system !== cdata) {
            for (const k in system.data) {
                const obj = system.data[k] as unknown as {
                    type?: unknown;
                    bpType?: unknown;
                    modifiers?: unknown;
                    id?: string;
                };
                if (
                    "event" === obj.type &&
                    "function" === obj.bpType &&
                    undefined !== obj.modifiers
                ) {
                    cdata.data[obj.id] = Object.assign(Object.assign({}, obj), { target: ext });
                }
            }
        }
    }

    public removeData(ext: string) {
        this.isResetData = true;
        delete this.constData[ext];
        delete this._extendsData[ext];
    }

    public resetData(data: Record<string, unknown>, ext: string) {
        this.isResetData = true;
        const d = data as {
            name?: string;
            caption?: string;
            construct?: { params?: unknown[] } | null;
            [key: string]: unknown;
        };
        if (null == d.caption) d.caption = d.name;
        d.name = ext;
        if (null == d.construct) {
            d.construct = {
                params: [],
            };
        }
        delete this.constData[ext];
        delete this._extendsData[ext];
        this._extendsData[ext] = d;
        this._createExtData({ [ext]: d }, ext, null);
    }

    public initData(data: Record<string, unknown>) {
        for (let ext in data) {
            delete this.constData[ext];
        }
        for (let ext in data) {
            const setData = data[ext] as any;
            this._extendsData[ext] = setData;
            let isGetClass = true;
            if (
                setData &&
                "Interface" === setData.type &&
                (!setData.funcs || 0 === setData.funcs.length)
            ) {
                isGetClass = false;
            }
            if (this._getClass && isGetClass) {
                this._getClass(ext);
            }
            this._createExtData(data as Record<string, unknown>, ext, null);
        }
    }

    public static handleCDataTypes(
        cdata: Record<string, unknown>,
        fun: Record<string, unknown>,
        ext: string,
    ) {
        const c = cdata as any;
        const f = fun as any;
        if (this.funlike.includes(c.type)) {
            c.properties = c.properties || [];
            if (!f.modifiers || !f.modifiers.isStatic) {
                c.properties.unshift({
                    name: TARGETID,
                    caption: "target",
                    type: ext,
                    id: TARGETID,
                });
            }
            if (c.type == BPType.Pure) {
                c.output.shift();
            } else {
                c.properties.unshift(this.defFunIn);
            }
            if ("void" != f.returnType) {
                if (f.returnType instanceof Array) {
                    c.output.push(...f.returnType);
                } else {
                    c.output.push({ name: "return", type: f.returnType });
                }
            }
        }
    }

    public static createCData(fun: Record<string, unknown>): Record<string, unknown> {
        const f = fun as any;
        const parms = f.params;
        let parmsId = "_";
        if (parms) {
            for (let i = 0, len = parms.length; i < len; i++) {
                const p = parms[i];
                parmsId += "_" + p.name;
            }
        }
        let cdata: Record<string, unknown> = {
            bpType: "function",
            modifiers: f.modifiers,
            name: f.name,
            id: "fun_" + f.name + parmsId,
            oldId: "fun_" + f.name,
            type: BPType.Function,
            output: [this.defEventOut],
            properties: [],
        };
        if (null != f.customId) {
            cdata.id = f.customId;
            cdata.oldId = f.customId;
        } else {
            cdata.id = f.modifiers.isStatic ? cdata.id + "_static" : cdata.id;
            cdata.oldId = f.modifiers.isStatic ? cdata.oldId + "_static" : cdata.oldId;
        }
        cdata.menuPath = f.menuPath;
        cdata.type = BlueprintData.checklike.includes(f.type) ? f.type : cdata.type;
        cdata.type = f.customId ? BPType.CustomFun : cdata.type;
        cdata.customId = f.customId || cdata.customId;
        cdata.typeParameters = f.typeParameters || cdata.typeParameters;
        return cdata;
    }

    public static formatData(
        data: BlueprintAssetJson,
        assetId: string,
        dataMap: Record<string, unknown>,
        varMap: Record<string, unknown>,
    ): BlueprintClassDeclaration {
        const d = data as any;
        let map = data.blueprintArr as Record<string, { arr: Array<Record<string, unknown>> }>;
        let dec: BlueprintClassDeclaration = {
            name: assetId,
            props: [],
            funcs: [],
            events: [],
            extends: data.extends,
        };
        for (const key in map) {
            let item = map[key];
            this._initTarget(item.arr, assetId);
        }
        if (d.variable) {
            let decProps = dec.props;
            (d.variable as any[]).forEach((ele) => {
                dataMap && (dataMap[ele.id] = ele);
                varMap && (varMap[ele.id] = ele);
                let decProp = {
                    name: ele.name,
                    tips: ele.tips,
                    caption: ele.caption,
                    type: ele.type,
                    customId: String(ele.id),
                    modifiers: ele.modifiers,
                    value: ele.value,
                };
                if (null == decProp.modifiers) decProp.modifiers = {};
                decProps.push(decProp);
            });
        }
        if (d.events)
            (d.events as any[]).forEach((ele) => {
                dataMap && (dataMap[ele.id] = ele);
                dec.events.push(ele);
            });
        if (d.functions) {
            let funcs = dec.funcs;
            (d.functions as any[]).forEach((ele) => {
                dataMap && (dataMap[ele.id] = ele);
                if (dataMap && ele.variable) {
                    ele.variable.forEach((ele) => {
                        dataMap[ele.id] = ele;
                    });
                }
                this._initTarget(ele.arr, assetId);
                let func: Record<string, unknown> = {
                    name: ele.name,
                    tips: ele.tips,
                    type: "function",
                    customId: ele.id,
                    caption: ele.caption,
                    params: [],
                    modifiers: ele.modifiers,
                    returnType: "void",
                };
                if (null == func.modifiers) func.modifiers = {};
                let inputs = ele.properties;
                if (inputs) {
                    let params = func.params as any[];
                    for (let j = 0, len = inputs.length; j < len; j++) {
                        let input = inputs[j];
                        let param = {
                            name: input.name,
                            tips: input.tips,
                            caption: input.caption,
                            type: input.type,
                            id: input.id,
                        };
                        params.push(param);
                    }
                }
                let outputs = ele.output;
                if (outputs) {
                    let returnType = [];
                    for (let j = 0, len = outputs.length; j < len; j++) {
                        let output = outputs[j];
                        returnType.push({
                            name: output.name,
                            tips: output.tips,
                            caption: output.caption,
                            type: output.type,
                            id: output.id,
                        });
                    }
                    func.returnType = returnType;
                }
                funcs.push(func as any);
            });
        }
        return dec;
    }

    private static _initTarget(arr: Array<Record<string, unknown>>, target: string) {
        for (let i = arr.length - 1; i >= 0; i--) {
            const item = arr[i] as { dataId?: unknown; target?: unknown } & Record<string, unknown>;
            if (null != item.dataId && item.target == null) {
                (item as any).target = target;
            }
        }
    }
}
