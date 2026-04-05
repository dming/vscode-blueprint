// Auto-generated from res/y.blueprint.js

import { BluePrintBlock } from "./BluePrintBlock";
import { BluePrintEventBlock } from "./BluePrintEventBlock";
import type { BlueprintExecuteNode } from "./BlueprintExecuteNode";
import type { BlueprintEventNode } from "./node/BlueprintEventNode";
import type { BlueprintNode } from "./BlueprintNode";
import { BlueprintFactory } from "./BlueprintFactory";
import type { BlueprintRunBase } from "./BlueprintRunBase";
import type { BlueprintRuntimeBaseNode } from "./node/BlueprintRuntimeBaseNode";
import { BlueprintUtil } from "./BlueprintUtil";
import { BPType, EXECID } from "./BlueprintDefs";
import type { BlueprintNodeDefJson } from "./BlueprintNode";
import type { BlueprintDataMap, BlueprintJsonItem } from "../../shared/JsonType/BlueprintJsonTypes";
import type { BlueprintLocalVarMap } from "./BlueprintRuntimeTypes";

export class BluePrintComplexBlock extends BluePrintBlock {
  private _asList: BlueprintRuntimeBaseNode[];
  private _eventId: number;
  private _pendingClass: Map<string, (string | number)[]>;
  public dataMap: BlueprintDataMap | undefined;
  public localVarMap!: BlueprintLocalVarMap;
  public static EventId: number = 0;
  constructor(id: string | number) {
    super(id);
    this._asList = [];
    this._pendingClass = new Map();
    this._eventId = BluePrintComplexBlock.EventId++;
  }

  public initEventBlockMap(
    map: Map<string | number, BlueprintNode>,
    eventMap: Map<string, BluePrintEventBlock>
  ) {
    map.forEach((value) => {
      let eventBlock = eventMap.get(String(value.nid));
      if (!eventBlock) {
        eventBlock = new BluePrintEventBlock(String(value.nid));
        eventMap.set(String(value.nid), eventBlock);
      }
      eventBlock.init(value as BlueprintEventNode);
      eventBlock.dataMap = this.dataMap;
      eventBlock.optimize();
    });
  }

  public optimize() {
    super.optimize();
    this._asList.forEach((value) => {
      value.optimize();
    });
    this.initEventBlockMap(this.anonymousfunMap, this.anonymousBlockMap);
    this.anonymousBlockMap.forEach((value) => {
      value.optimizeByBlockMap(this);
    });
  }

  public parse(
    bpjson: BlueprintJsonItem[],
    getCNodeByNode: (item: BlueprintJsonItem) => unknown,
    varMap: BlueprintLocalVarMap
  ) {
    this.localVarMap = varMap;
    if (!this._checkReady(bpjson, getCNodeByNode, varMap)) return;
    bpjson.forEach((item) => {
      const node = BlueprintFactory.instance.createNew(
        getCNodeByNode(item) as BlueprintNodeDefJson,
        item
      );
      this.append(node, item);
    });
    bpjson.forEach((item) => {
      const parsed = this.getNodeById(item.id as string | number);
      if (parsed) {
        parsed.parseLinkData(item, this);
      }
    });
    this.onParse(bpjson);
    this.optimize();
  }

  private _onReParse(
    bpjson: BlueprintJsonItem[],
    getCNodeByNode: (item: BlueprintJsonItem) => unknown,
    varMap: BlueprintLocalVarMap,
    name: string
  ) {
    const result = this._pendingClass.get(name);
    if (result) {
      this._pendingClass.delete(name);
    }
    if (this._pendingClass.size == 0) {
      delete BlueprintUtil.onfinishCallbacks[this._eventId];
      this.parse(bpjson, getCNodeByNode, varMap);
    }
  }

  public onEventParse(_eventName: string) {}

  private _checkReady(
    bpjson: BlueprintJsonItem[],
    getCNodeByNode: (item: BlueprintJsonItem) => unknown,
    varMap: Record<string, unknown>
  ): boolean {
    bpjson.forEach((item) => {
      const itemdef = getCNodeByNode(item);
      if (!itemdef) {
        const classID = item.target as string;
        if (!classID) {
          console.error("It's old style:" + item.name);
        }
        const pcls = this._pendingClass.get(classID);
        if (pcls) {
          pcls.push(item.id as string | number);
        } else {
          this._pendingClass.set(classID, [item.id as string | number]);
        }
      } else {
        const def = itemdef as {
          type: string;
          name: string;
          output?: Record<string, unknown>;
        };
        const outMap = item.output as Record<string, unknown> | undefined;
        if (def.type == BPType.Event && outMap && outMap["out_" + EXECID]) {
          this.onEventParse(def.name);
        }
      }
    });
    if (this._pendingClass.size > 0) {
      BlueprintUtil.onfinishCallbacks[this._eventId] = [
        this._onReParse,
        this,
        [bpjson, getCNodeByNode, varMap],
      ];
      return false;
    }
    return true;
  }

  public append(node: BlueprintNode, item: BlueprintJsonItem) {
    super.append(node, item);
    switch (node.type) {
      case BPType.Assertion:
        this._asList.push(node as BlueprintRuntimeBaseNode);
        break;
      case BPType.Event:
        if (item.dataId) {
          this.anonymousfunMap.set(node.nid, node);
        }
        break;
    }
  }

  public finishChild(_context: BlueprintExecuteNode, _runtime: BlueprintRunBase) {}
}
