// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import { BlueprintFunNode } from "./BlueprintFunNode";
import { BlueprintPinRuntime } from "../BlueprintPinRuntime";
import { BlueprintUtil } from "../BlueprintUtil";
import type { BluePrintBlock } from "../BluePrintBlock";
import type { RuntimeDataManager } from "../RuntimeDataManager";

export class BlueprintSetTempVarNode extends BlueprintFunNode {
    private _varKey: string | undefined;
    constructor() {
        super();
    }

    public onParseLinkData(
        node: { target: string; dataId: unknown },
        manager: { dataMap: Record<string, { name?: string }> },
    ) {
        let cfg = manager.dataMap[String(node.dataId)];
        this._varKey = cfg
            ? cfg.name
            : BlueprintUtil.getConstDataById<{ name?: string }>(node.target, String(node.dataId))
                  ?.name;
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
        let _parmsArray = this.collectParam(
            context,
            runtimeDataMgr,
            this.inPutParmPins,
            runner,
            runId,
            prePin,
        );
        context.parmFromCustom(_parmsArray, this._varKey, '"' + this._varKey + '"');
        context.parmFromCustom(_parmsArray, runtimeDataMgr, "runtimeDataMgr");
        context.parmFromCustom(_parmsArray, runId, "runId");
        if (this.nativeFun) {
            context.executeFun(
                this.nativeFun,
                this.returnValue,
                runtimeDataMgr,
                BlueprintFunNode,
                _parmsArray,
                runId,
            );
        }
        return this.next();
    }
}
