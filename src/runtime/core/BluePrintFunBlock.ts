// Auto-generated from res/y.blueprint.js

import type { BlueprintJsonItem } from "../../shared/JsonType/BlueprintJsonTypes";
import { BluePrintComplexBlock } from "./BluePrintComplexBlock";
import { BluePrintFunStartBlock } from "./BluePrintFunStartBlock";
import type { BlueprintCustomFunStart } from "./node/BlueprintCustomFunStart";
import type { BlueprintExecuteNode } from "./BlueprintExecuteNode";
import type { BluePrintBlock } from "./BluePrintBlock";
import type { BluePrintMainBlock } from "./BluePrintMainBlock";
import type { BlueprintPinRuntime } from "./BlueprintPinRuntime";
import type { RuntimeDataManager } from "./RuntimeDataManager";
import { EBlockSource } from "./BlueprintDefs";

export class BluePrintFunBlock extends BluePrintComplexBlock {
  public funBlock: BluePrintFunStartBlock | null;
  public funStart: BlueprintCustomFunStart | undefined;
  public isStatic: boolean | undefined;
  /** Set by `BlueprintRuntime` before the fun block runs. */
  public mainBlock!: BluePrintMainBlock;
  constructor(id: string | number) {
    super(id);
    this.funBlock = null;
  }

  public get bpId() {
    return this.mainBlock.name;
  }

  public get blockSourceType() {
    return EBlockSource.Function;
  }

  public optimize() {
    super.optimize();
    if (!this.funStart) {
      return;
    }
    this.funBlock = new BluePrintFunStartBlock(this.id);
    this.funBlock.init(this.funStart);
    this.funBlock.optimizeByBlockMap(this);
  }

  public onParse(bpjson: Array<{ id: string | number }>) {
    this.funStart = this.getNodeById(bpjson[0].id as string | number) as
      | BlueprintCustomFunStart
      | undefined;
  }

  public parse(
    bpjson: BlueprintJsonItem[],
    getCNodeByNode: (item: BlueprintJsonItem) => unknown,
    varMap: BluePrintComplexBlock["localVarMap"]
  ) {
    super.parse(bpjson, getCNodeByNode, varMap);
    this.funStart = this.getNodeById(bpjson[0].id as string | number) as
      | BlueprintCustomFunStart
      | undefined;
  }

  public run(
    context: BlueprintExecuteNode,
    eventName: string | null,
    parms: unknown[] | null,
    cb: (() => void) | null,
    runId: number,
    execId: number,
    outExecutes: BlueprintPinRuntime[],
    runner: BluePrintBlock,
    oldRuntimeDataMgr: RuntimeDataManager
  ) {
    context.initData(this.id, this.nodeMap, this.localVarMap);
    if (!this.funBlock) {
      return null;
    }
    return this.funBlock.runFun(
      context,
      eventName,
      parms,
      cb,
      runId,
      execId,
      outExecutes,
      runner,
      oldRuntimeDataMgr
    );
  }
}
