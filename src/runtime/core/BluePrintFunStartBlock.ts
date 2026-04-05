// Auto-generated from res/y.blueprint.js

import { BluePrintEventBlock } from "./BluePrintEventBlock";
import type { BlueprintCustomFunReturn } from "./node/BlueprintCustomFunReturn";
import type { BlueprintCustomFunStart } from "./node/BlueprintCustomFunStart";
import type { BlueprintExecuteNode } from "./BlueprintExecuteNode";
import type { BluePrintBlock } from "./BluePrintBlock";
import type { BlueprintPinRuntime } from "./BlueprintPinRuntime";
import type { RuntimeDataManager } from "./RuntimeDataManager";
import { BPType } from "./BlueprintDefs";

export class BluePrintFunStartBlock extends BluePrintEventBlock {
    public funEnds: BlueprintCustomFunReturn[];
    public funStart: BlueprintCustomFunStart | null;
    constructor(id?: string | number) {
        super(id);
        this.funEnds = [];
    }

    public init(event: BlueprintCustomFunStart) {
        this.funStart = event;
        super.init(event);
        this.executeList.forEach((value) => {
            if (value.type == BPType.CustomFunReturn) {
                this.funEnds.push(value as BlueprintCustomFunReturn);
            }
        });
    }

    public runFun(
        context: BlueprintExecuteNode,
        eventName: string | null,
        parms: unknown[] | null,
        cb: (() => void) | null,
        runId: number,
        execId: number,
        outExecutes: BlueprintPinRuntime[],
        runner: BluePrintBlock,
        oldRuntimeDataMgr: RuntimeDataManager,
    ) {
        let fun = this.funStart;
        if (fun) {
            let runtimeDataMgr = context.getDataManagerByID(this.parentId);
            let curRunId = this.getRunID();
            if (parms) {
                this.funEnds.forEach((value) => {
                    value.initData(
                        runtimeDataMgr,
                        curRunId,
                        runId,
                        parms,
                        fun.outPutParmPins.length,
                        outExecutes,
                        runner,
                        oldRuntimeDataMgr,
                    );
                });
                fun.initData(runtimeDataMgr, parms, curRunId);
            }
            return this.runByContext(
                context,
                runtimeDataMgr,
                fun,
                true,
                cb,
                curRunId,
                fun.outExecutes[execId],
                null,
            );
        }
        return null;
    }
}
