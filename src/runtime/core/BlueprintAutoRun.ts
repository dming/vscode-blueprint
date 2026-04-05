// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "./BlueprintExecuteNode";
import { BlueprintRuntimeBaseNode } from "./node/BlueprintRuntimeBaseNode";
import type { BlueprintPinRuntime } from "./BlueprintPinRuntime";
import type { BluePrintBlock } from "./BluePrintBlock";
import type { RuntimeDataManager } from "./RuntimeDataManager";

export class BlueprintAutoRun extends BlueprintRuntimeBaseNode {
    public collectParam(
        context: BlueprintExecuteNode,
        runtimeDataMgr: RuntimeDataManager,
        inputPins: BlueprintPinRuntime[],
        runner: BluePrintBlock,
        runId: number,
        prePin: BlueprintPinRuntime | null,
    ) {
        const nodeData = runtimeDataMgr.getDataById(this.nid);
        if (!nodeData) {
            throw new Error(`BlueprintAutoRun: missing RuntimeNodeData for nid ${String(this.nid)}`);
        }
        const _parmsArray = nodeData.getParamsArray(runId);
        _parmsArray.length = 0;
        for (let i = 0, n = inputPins.length; i < n; i++) {
            const curInput = inputPins[i];
            if (!curInput) {
                continue;
            }
            const from = curInput.linkTo[0];
            if (from) {
                const fowner = from.owner;
                if (!context.getCacheAble(fowner, runId)) {
                    from.step(context, runtimeDataMgr, runner, runId, prePin);
                    context.setCacheAble(fowner, runId, true);
                }
                context.parmFromOtherPin(curInput, runtimeDataMgr, from, _parmsArray, runId);
            } else {
                context.parmFromSelf(curInput, runtimeDataMgr, _parmsArray, runId);
            }
        }
        context.readCache = false;
        return _parmsArray;
    }
}
