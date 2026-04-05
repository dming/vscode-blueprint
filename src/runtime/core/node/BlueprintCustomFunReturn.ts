// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import type { BlueprintCustomFunReturnContext } from "./BlueprintCustomFunReturnContext";
import { BlueprintPinRuntime } from "../BlueprintPinRuntime";
import { BlueprintRuntimeBaseNode } from "./BlueprintRuntimeBaseNode";
import { EPinDirection, EPinType } from "../BlueprintDefs";
import type { BluePrintBlock } from "../BluePrintBlock";
import type { RuntimeDataManager } from "../RuntimeDataManager";

export class BlueprintCustomFunReturn extends BlueprintRuntimeBaseNode {
    public inExecutes: BlueprintPinRuntime[];
    public nid: string | number;
    constructor() {
        super();
        this.inExecutes = [];
    }

    public step(
        context: BlueprintExecuteNode,
        runtimeDataMgr: RuntimeDataManager,
        fromExecute: boolean,
        runner: BluePrintBlock,
        enableDebugPause: boolean,
        runId: number,
        fromPin: BlueprintPinRuntime | null,
        prePin: BlueprintPinRuntime | null,
    ) {
        super.step(
            context,
            runtimeDataMgr,
            fromExecute,
            runner,
            enableDebugPause,
            runId,
            fromPin,
            prePin,
        );
        let nodeContext = runtimeDataMgr.getDataById<BlueprintCustomFunReturnContext>(this.nid)!;
        let index = this.inExecutes.indexOf(fromPin);
        if (index == 0) {
            let curRunId = nodeContext.runIdMap.get(runId);
            nodeContext.returnResult(runId, curRunId);
        } else {
            nodeContext.returnResult(runId, runId);
            nodeContext.runExecute(runId, index, context);
            return 1;
        }
        return null;
    }

    public initData(
        runtimeDataMgr: RuntimeDataManager,
        curRunId: number,
        runId: number,
        parms: unknown[],
        offset: number,
        outExecutes: BlueprintPinRuntime[],
        runner: BluePrintBlock,
        oldRuntimeDataMgr: RuntimeDataManager,
    ) {
        let data = runtimeDataMgr.getDataById<BlueprintCustomFunReturnContext>(this.nid)!;
        data.initData(curRunId, runId, parms, offset, outExecutes, runner, oldRuntimeDataMgr);
    }

    public addPin(pin: BlueprintPinRuntime) {
        super.addPin(pin);
        if (pin.type == EPinType.Exec) {
            if (pin.direction == EPinDirection.Input) {
                this.inExecutes.push(pin);
            }
        }
    }
}
