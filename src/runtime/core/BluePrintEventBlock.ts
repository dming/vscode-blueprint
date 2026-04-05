// Auto-generated from res/y.blueprint.js

import { BluePrintBlock } from "./BluePrintBlock";
import { BPType } from "./BlueprintDefs";
import type { BlueprintNode } from "./BlueprintNode";
import type { BlueprintExecuteNode } from "./BlueprintExecuteNode";
import type { BlueprintEventNode } from "./node/BlueprintEventNode";
import type { BlueprintRunBase } from "./BlueprintRunBase";
import type { BlueprintRuntimeBaseNode } from "./node/BlueprintRuntimeBaseNode";
import type { RuntimeDataManager } from "./RuntimeDataManager";
import type { BlueprintDataMap } from "../../shared/JsonType/BlueprintJsonTypes";

/** Parent block (main / complex) that forwards `finish` from nested event runs. */
export type BluePrintParentWithFinish = BluePrintBlock & {
  finishChild(context: BlueprintExecuteNode, runtime: BlueprintRunBase): void;
};

export class BluePrintEventBlock extends BluePrintBlock {
  public dataMap: BlueprintDataMap | undefined;
  public haRef: boolean;
  public parent: BluePrintBlock | null;
  public parentId: string | number | undefined;
  constructor(id?: string | number) {
    super(id ?? 0);
    this.haRef = false;
    this.parent = null;
  }

  public static findParamPin(
    node: BlueprintRuntimeBaseNode,
    nodeMap: Map<string | number, BlueprintNode>,
    anonymousfunMap: Map<string | number, BlueprintNode>,
    executeList: BlueprintRuntimeBaseNode[],
    bluePrintEventBlock: BluePrintEventBlock
  ) {
    const nodeData = nodeMap.get(node.nid);
    if (nodeData) {
      return;
    } else {
      nodeMap.set(node.nid, node);
      node.inPutParmPins.forEach((value) => {
        const linkPin = value.linkTo[0];
        if (linkPin) {
          const linkNode = linkPin.owner;
          const linkOuts = linkNode.outExecutes;
          if (linkOuts != null && linkOuts.length > 0) {
            if (linkNode.type == BPType.Event && (linkNode as BlueprintEventNode).isAnonymous) {
              anonymousfunMap.set(linkNode.nid, linkNode);
            }
            if (!nodeMap.has(linkNode.nid)) {
              if (executeList.indexOf(linkNode) == -1) {
                bluePrintEventBlock.haRef = true;
              }
              nodeMap.set(linkNode.nid, linkNode);
            }
          } else {
            BluePrintEventBlock.findParamPin(
              linkNode,
              nodeMap,
              anonymousfunMap,
              executeList,
              bluePrintEventBlock
            );
          }
        }
      });
    }
  }

  public init(event: BlueprintEventNode) {
    this.name = event.eventName || event.name;
    this.optimizeByStart(event, this.executeList);
    this.executeList.forEach((value) => {
      BluePrintEventBlock.findParamPin(
        value,
        this.nodeMap,
        this.anonymousfunMap,
        this.executeList,
        this
      );
    });
  }

  private _checkRef(): boolean {
    for (const key of this.nodeMap.keys()) {
      const node = this.nodeMap.get(key) as BlueprintRuntimeBaseNode;
      if ((node.getRef() ?? 0) > 1) {
        return true;
      }
    }
    return false;
  }

  public optimizeByBlockMap(parent: BluePrintBlock) {
    this.parentId = parent.id;
    this.parent = parent;
    let hasRefAnony = false;
    this.anonymousfunMap.forEach((value) => {
      const block = parent.anonymousBlockMap.get(String(value.nid));
      if (!block) {
        return;
      }
      if (block.haRef) {
        hasRefAnony = true;
      }
      this.anonymousBlockMap.set(String(value.nid), block);
    });
    this.hasRefAnony = hasRefAnony;
  }

  public getRunID() {
    return this.parent!.getRunID();
  }

  public recoverRunID(id: number, runtimeDataMgr: RuntimeDataManager) {
    if (!this.hasRefAnony) {
      this.parent!._recoverRunID(id, runtimeDataMgr);
    }
  }

  public run(
    context: BlueprintExecuteNode,
    event: BlueprintEventNode,
    parms: unknown[] | null,
    cb: (() => void) | null,
    runId: number,
    execId: number
  ) {
    const pid = this.parentId;
    if (pid === undefined) {
      throw new Error("BluePrintEventBlock.run: parentId is not set");
    }
    const runtimeDataMgr = context.getDataManagerByID(pid);
    if (!runtimeDataMgr) {
      throw new Error(`BluePrintEventBlock.run: no RuntimeDataManager for ${String(pid)}`);
    }
    if (parms) {
      event.initData(runtimeDataMgr, parms, runId);
    }
    const outExec = event.outExecutes?.[execId];
    if (!outExec) {
      throw new Error("BluePrintEventBlock.run: missing event output execute pin");
    }
    return this.runByContext(
      context,
      runtimeDataMgr,
      event,
      true,
      cb,
      runId,
      outExec,
      null
    );
  }

  public getDataManagerByID(context: BlueprintExecuteNode) {
    const pid = this.parentId;
    if (pid === undefined) {
      return undefined;
    }
    return context.getDataManagerByID(pid);
  }

  public get bpId() {
    return this.parent!.bpId;
  }

  public get blockSourceType() {
    return this.parent!.blockSourceType;
  }

  public finish(context: BlueprintExecuteNode) {
    (this.parent as BluePrintParentWithFinish)!.finishChild(
      context,
      this as unknown as BlueprintRunBase
    );
  }
}
