// Auto-generated from res/y.blueprint.js

import { BPType, EXECID, TARGETID } from "./BlueprintDefs";
import { BlueprintDataList } from "./BlueprintDataList";
import type {
  BlueprintClassDeclaration,
  BlueprintConstBucket,
  BlueprintDeclarationEvent,
  BlueprintDeclarationFunction,
  BlueprintDeclarationParam,
  BlueprintDeclarationProp,
  BlueprintGetClass,
  BlueprintRegFunction,
} from "./BlueprintDataTypes";
import type { BlueprintAssetJson, BlueprintFunctionGraphJson } from "../../shared/JsonType/BlueprintJsonTypes";

/** Mutable node def bucket entry (reflection / `constData` graph). */
type BlueprintConstNodeEntry = Record<string, unknown> & {
  type?: string;
  name?: string;
  properties?: Array<{ name?: string; caption?: string; type?: unknown }>;
  output?: Array<{ name?: string; caption?: string; type?: unknown }>;
  _isClone?: boolean;
};

/** Raw class manifest fragment passed into `_createConstData`. */
type BlueprintExtManifest = Record<string, unknown> & {
  props?: Array<
    Record<string, unknown> & {
      name?: string;
      customId?: unknown;
      modifiers?: { isStatic?: boolean };
    }
  >;
  type?: string;
  funcs?: unknown[];
  events?: Array<
    Record<string, unknown> & {
      id?: string;
      name?: string;
      customId?: unknown;
      params?: unknown;
      properties?: unknown;
      bpType?: string;
      target?: string;
    }
  >;
  construct?: Record<string, unknown> & { params?: unknown[] };
};

/** Constructor helper row stored in `cdata.data`. */
type ConstructBlueprintEntry = Record<string, unknown> & {
  name: string;
  target: string;
  menuPath: string;
  id: string;
  bpType: string;
  type: BPType;
  properties: Array<{ name: string; type: unknown }>;
  output: Array<{ name: string; type: string }>;
};

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
        const key = type.substring(0, index);
        const value = type.substring(index + 1, type.lastIndexOf(">"));
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
    getClass: BlueprintGetClass | null = null
  ) {
    this.constData = {};
    this.autoCreateData = {};
    this.isStartCatch = true;
    this.isResetData = false;
    this._extendsData = extendsData;
    this._regFunction = regFunction;
    this._getClass = getClass;
    const list = BlueprintDataList;
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i];
      if (null == o) continue;
      if (null == o.id) o.id = o.name;
      if (null == o.bpType) o.bpType = "function";
      if (null == o.target) o.target = "system";
      const entryId = o.id;
      if (entryId == null || entryId === "") {
        continue;
      }
      if (null == this.constData[o.target]) this.constData[o.target] = { data: {} };
      this.constData[o.target].data[String(entryId)] = o;
      let input = o.properties;
      if (input) {
        for (let i = input.length - 1; i >= 0; i--) {
          const o = input[i];
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
          const o = output[i];
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
    const o = this._extendsData[ext];
    if (null != o) this.getExtends((o as { extends?: string }).extends as string, arr);
    return arr;
  }

  public getConstDataById<T = unknown>(target: string, dataId: string): T | null {
    if (null != this.getConstDataExt) {
      const ret = this.getConstDataExt(target, dataId) as T | null;
      if (null != ret) return ret;
    }
    const targetData = this.constData[target];
    if (targetData) {
      return targetData.data[dataId] as T;
    }
    return null;
  }

  private _getConstData(cid: string | null | undefined, target?: string | null): unknown {
    if (cid == null || cid === "") {
      return null;
    }
    if (("construct" == cid || cid.startsWith("construct_")) && target) {
      cid = "construct_" + target;
    }
    let t = target;
    if (null == t) t = "system";
    const targetData = this.constData[t];
    if (targetData) {
      const ret = targetData.data[cid];
      if (null == ret && "system" != t) {
        return this._getConstData(cid);
      }
      return ret;
    } else if ("system" != t) {
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
      const cidStr = n.cid ?? "";
      const targetStr = n.target ?? "";
      const id = `${cidStr}_${n.dataId}_${targetStr}`;
      if (this.isStartCatch && null != this.autoCreateData[id]) return this.autoCreateData[id];
      let cdata = this._getConstData(n.cid, n.target) as BlueprintConstNodeEntry | null;
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
        const obj = BlueprintData.allDataMap.get(targetStr);
        if (obj) {
          data = obj[n.dataId];
          if (!data) {
            let dataId = n.dataId;
            const findIndex = dataId.lastIndexOf("_");
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
        data = this.getConstDataById(targetStr, n.dataId);
      }
      if (data) {
        const row = data as BlueprintConstNodeEntry;
        cdata = BlueprintData.clone(cdata) as BlueprintConstNodeEntry;
        cdata._isClone = true;
        const arr = row.properties;
        if (BPType.CustomFunReturn != cdata.type) {
          if (arr) {
            for (let i = 0, len = arr.length; i < len; i++) {
              const slot = arr[i];
              if (!slot) {
                continue;
              }
              if (null == slot.name || "" == String(slot.name).trim()) {
                if (null != slot.caption && "" != String(slot.caption).trim()) {
                  console.log(
                    "数据异常，应该是属性面板增加了这个属性，但是没有自动创建数据的id号，出现原因不明，有可能是数据回退造成的，待查！"
                  );
                }
                continue;
              }
              if (BPType.Event == cdata.type || BPType.CustomFunStart == cdata.type) {
                if (null == cdata.output) cdata.output = [];
                this._checkAndPush(cdata.output, slot);
              } else {
                if (null == cdata.properties) cdata.properties = [];
                this._checkAndPush(cdata.properties, slot);
              }
            }
          }
        }
        if (
          BPType.CustomFunStart != cdata.type &&
          BPType.Event != cdata.type &&
          "event_call" != cdata.name
        ) {
          const arr = row.output;
          if (arr) {
            for (let i = 0, len = arr.length; i < len; i++) {
              const slot = arr[i];
              if (!slot || null == slot.name || "" == String(slot.name).trim()) {
                continue;
              }
              if (BPType.CustomFunReturn == cdata.type) {
                if (null == cdata.properties) cdata.properties = [];
                this._checkAndPush(cdata.properties, slot);
              } else {
                if (null == cdata.output) cdata.output = [];
                this._checkAndPush(cdata.output, slot);
              }
            }
          }
        }
        this.autoCreateData[id] = cdata;
        return cdata;
      }
    } else {
      return this._getConstData(
        node.cid as string | null | undefined,
        node.target as string | null | undefined
      );
    }
    return null;
  }

  public getConstNode(node: Record<string, unknown>) {
    const n = node as {
      properties?: Array<Record<string, unknown>>;
      outputs?: Array<Record<string, unknown>>;
    };
    let ret = this._getConstByNode(node) as BlueprintConstNodeEntry | null;
    if (((ret && n.properties) || n.outputs) && ret) {
      if (!ret._isClone) {
        ret = BlueprintData.clone(ret);
        ret._isClone = true;
      }
      if (n.properties && ret.properties) {
        const last = ret.properties.pop();
        if (last?.name) {
          const name = last.name.substring(3);
          for (let i = 0, len = n.properties.length; i < len; i++) {
            const o = n.properties[i];
            if (o) {
              o.caption = name + "_" + (i + 1);
            }
          }
          ret.properties.push(...n.properties);
          ret.properties.push(last);
        }
      }
      if (n.outputs && ret.output) {
        const last = ret.output.pop();
        if (last !== undefined) {
          ret.output.push(...n.outputs);
          ret.output.push(last);
        }
      }
    }
    return ret;
  }

  private _checkAndPush(arr: Array<{ name?: string }>, obj: { name?: string }) {
    const want = obj.name ?? "";
    for (let i = arr.length - 1; i >= 0; i--) {
      const cur = arr[i];
      if ((cur?.name ?? "") == want) {
        return;
      }
    }
    arr.push(obj);
  }

  private _checkOverrideProp(
    o: Record<string, Array<{ name: string }> | undefined>,
    overObj: Record<string, Array<{ name: string }> | undefined>,
    property: string,
    ext: string
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
    const o = data[ext] as Record<string, unknown> | undefined | null;
    if (null == o) {
      const eo = this._extendsData[ext];
      const eoe = eo as { extends?: string } | null | undefined;
      if (null != eoe && null != eoe.extends) {
        const ret = this._createExtData(data, eoe.extends, cls);
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
    const exts = (o as { extends?: string } | null | undefined)?.extends;
    if (exts) {
      const ret = this._createExtData(data, exts, cls);
      co = { data: Object.create(ret.data) };
      co.extends = exts;
      this._createConstData(o, co, ext, cls);
    } else {
      co = { data: {} };
      this._createConstData(o, co, ext, cls);
    }
    const oNamed = o as { name?: string; caption?: string } | null | undefined;
    if (oNamed?.name != ext) {
      co.caption = oNamed?.name;
    }
    if (oNamed != null && oNamed.caption != null) {
      co.caption = oNamed.caption;
    }
    this.constData[ext] = co;
    return co;
  }

  private _createConstData(
    o: Record<string, unknown>,
    cdata: BlueprintConstBucket,
    ext: string,
    cls: unknown
  ) {
    const obj = o as BlueprintExtManifest;
    const propsList = obj.props;
    if (propsList) {
      for (const po of propsList) {
        const pinIdBase = po.name ?? "var";
        po.id = "var_" + pinIdBase;
        if (null != po.customId) {
          po.id = String(po.customId);
        } else if (po.modifiers?.isStatic) {
          po.id += "_static";
        }
        po.const = true;
        po.target = ext;
        po.bpType = "prop";
        cdata.data[String(po.id)] = po;
      }
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
    const constructRoot = obj.construct;
    if (constructRoot) {
      const po: ConstructBlueprintEntry = {
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
      if (constructRoot.params) {
        po.properties = constructRoot.params.map((param) => {
          const p = param as { name: string; type?: unknown; dotdotdot?: boolean };
          return {
            name: BlueprintData.formatName(p),
            type: BlueprintData.formatType(p.type),
          };
        });
      }
      const poRec = po as Record<string, unknown>;
      for (const k in constructRoot) {
        if ("params" != k && null == poRec[k]) {
          poRec[k] = constructRoot[k];
        }
      }
    }
    const eventsList = obj.events;
    if (eventsList) {
      for (const eve of eventsList) {
        if (null == eve.id) {
          eve.id = "event_" + String(eve.name ?? "");
        }
        if (null != eve.customId) {
          eve.id = String(eve.customId);
        }
        eve.bpType = "event";
        eve.target = ext;
        if (null == eve.properties && null != eve.params) {
          eve.properties = eve.params;
        }
        cdata.data[String(eve.id)] = eve;
      }
    }
    const funcsList = obj.funcs;
    if (funcsList) {
      for (const rawFun of funcsList) {
        const fun = rawFun as Record<string, unknown> & {
          modifiers?: Record<string, unknown> & {
            isPublic?: boolean;
            isProtected?: boolean;
            isStatic?: boolean;
          };
          name?: string;
          returnType?: string;
          params?: Array<Record<string, unknown>>;
        };
        let modifiers = fun.modifiers;
        if (!modifiers) modifiers = fun.modifiers = {};
        if (modifiers.isPublic == null || modifiers.isPublic || modifiers.isProtected) {
          const po = BlueprintData.createCData(fun) as Record<string, unknown> & {
            target?: string;
            isAsync?: boolean;
            type?: string;
            id?: string;
            oldId?: string;
            output?: unknown[];
            properties?: unknown[];
          };
          po.target = ext;
          po.isAsync =
            typeof fun.returnType === "string" && fun.returnType.indexOf("Promise<") !== -1;
          if (this._regFunction && cls != null) {
            const host = cls as Record<string, unknown> & {
              prototype: Record<string, unknown>;
            };
            const fname = String(fun.name ?? "");
            const fn = modifiers.isStatic ? host[fname] : host.prototype[fname];
            this._regFunction(
              String(po.id),
              fn as (...args: unknown[]) => unknown,
              !modifiers.isStatic,
              cls as object,
              po.target
            );
          }
          if (fun.params && fun.params.length > 0) {
            const params = fun.params;
            for (let i = params.length - 1; i >= 0; i--) {
              const p = params[i] as { name: string; dotdotdot?: boolean };
              p.name = BlueprintData.formatName(p);
            }
            const out = (po.output ??= []) as Array<Record<string, unknown>>;
            if (BPType.Event == po.type) {
              out.push(...fun.params);
            } else {
              po.properties = [...fun.params];
            }
          }
          BlueprintData.handleCDataTypes(po, fun, ext);
          const poMut = po as Record<string, unknown>;
          for (const k in fun) {
            if (null == poMut[k]) {
              poMut[k] = fun[k];
            }
          }
          cdata.data[String(po.id)] = po;
          if (po.oldId != null) {
            cdata.data[String(po.oldId)] = po;
          }
        }
      }
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
        const sysId = obj.id;
        if (
          sysId &&
          "event" === obj.type &&
          "function" === obj.bpType &&
          undefined !== obj.modifiers
        ) {
          cdata.data[sysId] = Object.assign(Object.assign({}, obj), { target: ext });
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
    for (const ext in data) {
      delete this.constData[ext];
    }
    for (const ext in data) {
      const setData = data[ext] as Record<string, unknown> & {
        type?: string;
        funcs?: unknown[];
      };
      this._extendsData[ext] = setData;
      let isGetClass = true;
      const funcs = setData.funcs;
      if (setData && "Interface" === setData.type && (!funcs || funcs.length === 0)) {
        isGetClass = false;
      }
      if (this._getClass && isGetClass) {
        this._getClass(ext);
      }
      this._createExtData(data as Record<string, unknown>, ext, null);
    }
  }

  /**
   * Re-materialize one host / extends key from {@link _extendsData} after it was merged in late
   * (e.g. a second {@link initBlueprintCore} pass). Without this, {@link _createExtData} may have
   * created an empty bucket when the key was missing from `customData` during asset parse.
   */
  public rebuildConstDataForExtKey(ext: string): void {
    if (!Object.prototype.hasOwnProperty.call(this._extendsData, ext)) {
      return;
    }
    delete this.constData[ext];
    this._createExtData(this._extendsData as Record<string, unknown>, ext, null);
  }

  public static handleCDataTypes(
    cdata: Record<string, unknown>,
    fun: Record<string, unknown>,
    ext: string
  ) {
    const c = cdata as Record<string, unknown> & {
      type?: string;
      properties?: Array<Record<string, unknown>>;
      output?: Array<Record<string, unknown>>;
    };
    const f = fun as Record<string, unknown> & {
      modifiers?: { isStatic?: boolean };
      returnType?: unknown;
    };
    const ct = c.type;
    if (ct != null && this.funlike.includes(ct as BPType)) {
      const propArr = (c.properties ??= []);
      const outArr = (c.output ??= []);
      if (!f.modifiers || !f.modifiers.isStatic) {
        propArr.unshift({
          name: TARGETID,
          caption: "target",
          type: ext,
          id: TARGETID,
        });
      }
      if (c.type == BPType.Pure) {
        if (outArr.length > 0) {
          outArr.shift();
        }
      } else {
        propArr.unshift(this.defFunIn);
      }
      if ("void" != f.returnType) {
        if (f.returnType instanceof Array) {
          outArr.push(...f.returnType);
        } else {
          outArr.push({ name: "return", type: f.returnType });
        }
      }
    }
  }

  public static createCData(fun: Record<string, unknown>): Record<string, unknown> {
    const f = fun as Record<string, unknown> & {
      params?: Array<{ name: string }>;
      modifiers?: { isStatic?: boolean };
      name?: string;
      customId?: string;
      menuPath?: string;
      type?: string;
      typeParameters?: unknown;
    };
    const parms = f.params;
    let parmsId = "_";
    if (parms) {
      for (let i = 0, len = parms.length; i < len; i++) {
        const p = parms[i];
        parmsId += "_" + p.name;
      }
    }
    const cdata: Record<string, unknown> = {
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
      cdata.id = f.modifiers?.isStatic ? String(cdata.id) + "_static" : cdata.id;
      cdata.oldId = f.modifiers?.isStatic ? String(cdata.oldId) + "_static" : cdata.oldId;
    }
    cdata.menuPath = f.menuPath;
    const ft = f.type;
    cdata.type =
      ft != null && BlueprintData.checklike.includes(ft as BPType) ? ft : cdata.type;
    cdata.type = f.customId ? BPType.CustomFun : cdata.type;
    cdata.customId = f.customId || cdata.customId;
    cdata.typeParameters = f.typeParameters || cdata.typeParameters;
    return cdata;
  }

  public static formatData(
    data: BlueprintAssetJson,
    assetId: string,
    dataMap: Record<string, unknown>,
    varMap: Record<string, unknown>
  ): BlueprintClassDeclaration {
    const d = data;
    const map = data.blueprintArr as Record<string, { arr: Array<Record<string, unknown>> }>;
    const dec: BlueprintClassDeclaration = {
      name: assetId,
      props: [],
      funcs: [],
      events: [],
      extends: data.extends,
    };
    for (const key in map) {
      const item = map[key];
      this._initTarget(item.arr, assetId);
    }
    if (d.variable) {
      const decProps = dec.props;
      for (const ele of d.variable as Array<Record<string, unknown> & { id: string | number }>) {
        if (dataMap) {
          dataMap[String(ele.id)] = ele;
        }
        if (varMap) {
          varMap[String(ele.id)] = ele;
        }
        const decProp: BlueprintDeclarationProp = {
          name: String(ele.name ?? ""),
          tips: ele.tips != null ? String(ele.tips) : undefined,
          caption: ele.caption != null ? String(ele.caption) : undefined,
          type: ele.type != null ? String(ele.type) : undefined,
          customId: String(ele.id),
          modifiers:
            (ele.modifiers as Record<string, unknown> | undefined) ?? ({} as Record<string, unknown>),
          value: ele.value,
        };
        decProps.push(decProp);
      }
    }
    if (d.events) {
      for (const ele of d.events as Array<Record<string, unknown> & { id: string | number }>) {
        if (dataMap) {
          dataMap[String(ele.id)] = ele;
        }
        dec.events.push(ele as BlueprintDeclarationEvent);
      }
    }
    if (d.functions) {
      const funcsOut = dec.funcs;
      for (const ele of d.functions as BlueprintFunctionGraphJson[]) {
        if (dataMap) {
          dataMap[String(ele.id)] = ele;
        }
        if (dataMap && ele.variable) {
          for (const v of ele.variable) {
            dataMap[String(v.id)] = v;
          }
        }
        this._initTarget(ele.arr, assetId);
        const func: BlueprintDeclarationFunction = {
          name: String(ele.name ?? ""),
          tips: ele.tips != null ? String(ele.tips) : undefined,
          type: "function",
          customId: String(ele.id),
          caption: ele.caption != null ? String(ele.caption) : undefined,
          params: [],
          modifiers:
            (ele.modifiers as Record<string, unknown> | undefined) ?? ({} as Record<string, unknown>),
          returnType: "void",
        };
        const inputs = ele.properties;
        if (inputs) {
          const params = func.params;
          for (let j = 0, len = inputs.length; j < len; j++) {
            const input = inputs[j] as Record<string, unknown>;
            const param: BlueprintDeclarationParam = {
              name: input.name != null ? String(input.name) : undefined,
              tips: input.tips != null ? String(input.tips) : undefined,
              caption: input.caption != null ? String(input.caption) : undefined,
              type: input.type != null ? String(input.type) : undefined,
              id: input.id != null ? String(input.id) : undefined,
            };
            params.push(param);
          }
        }
        const outputs = ele.output;
        if (outputs) {
          const returnType: BlueprintDeclarationParam[] = [];
          for (let j = 0, len = outputs.length; j < len; j++) {
            const output = outputs[j] as Record<string, unknown>;
            returnType.push({
              name: output.name != null ? String(output.name) : undefined,
              tips: output.tips != null ? String(output.tips) : undefined,
              caption: output.caption != null ? String(output.caption) : undefined,
              type: output.type != null ? String(output.type) : undefined,
              id: output.id != null ? String(output.id) : undefined,
            });
          }
          func.returnType = returnType;
        }
        funcsOut.push(func);
      }
    }
    return dec;
  }

  private static _initTarget(arr: Array<Record<string, unknown>>, target: string) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const item = arr[i] as { dataId?: unknown; target?: unknown } & Record<string, unknown>;
      if (null != item.dataId && item.target == null) {
        item.target = target;
      }
    }
  }
}
