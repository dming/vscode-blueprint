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
        const result: RuntimePinData[] = [];
        this.returnMap.set(curRunId, result);
        this.runIdMap.set(curRunId, runId);
        this.outExecutesMap.set(curRunId, outExecutes);
        this.runnerMap.set(curRunId, [runner, runtimeDataMgr]);
        for (let i = offset; i < parms.length; i++) {
            result.push(parms[i] as RuntimePinData);
        }
    }

    public runExecute(runId: number, index: number, context: BlueprintExecuteNode) {
        const outExecutes = this.outExecutesMap.get(runId);
        if (outExecutes) {
            const outExecute = outExecutes[index];
            if (outExecute) {
                const nextPin = outExecute.linkTo[0];
                if (nextPin) {
                    const runner = this.runnerMap.get(runId);
                    if (!runner) {
                        return;
                    }
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
        const result = this.returnMap.get(runId);
        if (result) {
            result.forEach((parm, index) => {
                const rid = curRunId !== undefined ? curRunId : runId;
                parm.setValue(rid, this.getParamsArray(runId)[index]);
            });
        }
    }
}
