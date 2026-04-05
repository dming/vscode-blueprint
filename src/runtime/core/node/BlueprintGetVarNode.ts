// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import { BlueprintPinRuntime } from "../BlueprintPinRuntime";
import { BlueprintRuntimeBaseNode } from "./BlueprintRuntimeBaseNode";
import { BlueprintStaticFun } from "./BlueprintStaticFun";
import { BlueprintUtil } from "../BlueprintUtil";
import type { BluePrintBlock } from "../BluePrintBlock";
import type { RuntimeDataManager } from "../RuntimeDataManager";

export class BlueprintGetVarNode extends BlueprintRuntimeBaseNode {
    private _varKey: string | undefined;
    constructor() {
        super();
    }

    public onParseLinkData(node: { target: string; dataId: unknown }, manager: unknown) {
        let cfg = BlueprintUtil.getConstDataById<{ name?: string }>(
            node.target,
            String(node.dataId),
        );
        if (cfg) {
            this._varKey = cfg.name;
            this.name = this._varKey;
        }
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
        context.parmFromCustom(_parmsArray, context, "context");
        if (this.nativeFun) {
            this.checkTarget(_parmsArray[0]);
            let result = context.executeFun(
                this.nativeFun,
                this.returnValue,
                runtimeDataMgr,
                BlueprintStaticFun,
                _parmsArray,
                runId,
            );
            if (result == undefined) {
                runtimeDataMgr.setPinData(this.outPutParmPins[0], result, runId);
            }
        }
        return null;
    }
}
