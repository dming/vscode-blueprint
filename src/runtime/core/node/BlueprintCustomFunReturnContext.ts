// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import { BlueprintPinRuntime } from "../BlueprintPinRuntime";
import type { BluePrintBlock } from "../BluePrintBlock";
import { RuntimeNodeData } from "../RuntimeNodeData";
import type { RuntimeDataManager } from "../RuntimeDataManager";
import type { RuntimePinData } from "../RuntimePinData";

export class BlueprintCustomFunReturnContext extends RuntimeNodeData {
    public returnMap: Map<number, RuntimePinData[]>;
    public runIdMap: Map<number, number>;
    public outExecutesMap: Map<number, BlueprintPinRuntime[]>;
    public runnerMap: Map<number, [BluePrintBlock, RuntimeDataManager]>;
    constructor() {
        super();
        this.returnMap = new Map();
        this.runIdMap = new Map();
        this.outExecutesMap = new Map();
        this.runnerMap = new Map();
    }

    public initData(
        curRunId: number,
        runId: number,
        parms: unknown[],
        offset: number,
        outExecutes: BlueprintPinRuntime[],
        runner: BluePrintBlock,
        runtimeDataMgr: RuntimeDataManager,
    ) {
        let result = [];
        this.returnMap.set(curRunId, result);
        this.runIdMap.set(curRunId, runId);
        this.outExecutesMap.set(curRunId, outExecutes);
        this.runnerMap.set(curRunId, [runner, runtimeDataMgr]);
        for (let i = offset; i < parms.length; i++) {
            result.push(parms[i] as RuntimePinData);
        }
    }

    public runExecute(runId: number, index: number, context: BlueprintExecuteNode) {
        let outExecutes = this.outExecutesMap.get(runId);
        if (outExecutes) {
            let outExecute = outExecutes[index];
            if (outExecute) {
                let nextPin = outExecute.linkTo[0];
                if (nextPin) {
                    let runner = this.runnerMap.get(runId);
                    runner[0].runByContext(
                        context,
                        runner[1],
                        nextPin.owner,
                        true,
                        null,
                        runId,
                        nextPin,
                        outExecute,
                    );
                }
            }
        }
    }

    public returnResult(runId: number, curRunId: number | undefined) {
        let result = this.returnMap.get(runId);
        if (result) {
            result.forEach((parm, index) => {
                parm.setValue(curRunId, this.getParamsArray(runId)[index]);
            });
        }
    }
}
