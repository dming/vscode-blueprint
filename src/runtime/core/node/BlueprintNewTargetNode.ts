// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import type { BlueprintNodeConstructor } from "../BlueprintFactory";
import { BlueprintPinRuntime } from "../BlueprintPinRuntime";
import { BlueprintRuntimeBaseNode } from "./BlueprintRuntimeBaseNode";
import { BlueprintUtil } from "../BlueprintUtil";
import type { BluePrintBlock } from "../BluePrintBlock";
import type { RuntimeDataManager } from "../RuntimeDataManager";
import type { BlueprintNodeDefJson } from "../BlueprintNode";

export class BlueprintNewTargetNode extends BlueprintRuntimeBaseNode {
    public cls: BlueprintNodeConstructor | null | undefined;
    public parse(def: BlueprintNodeDefJson) {
        super.parse(def);
        this.cls = BlueprintUtil.getClass(def.target as string) as BlueprintNodeConstructor | null;
        if (!this.cls) {
            console.warn("regclass not find " + def.target);
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
        let result = this.cls ? Reflect.construct(this.cls, _parmsArray) : {};
        if (!this.cls) {
            for (let i = 0; i < this.inPutParmPins.length; i++) {
                let pin = this.inPutParmPins[i];
                if (pin.value !== undefined) {
                    result[pin.name] = pin.value;
                }
            }
        }
        runtimeDataMgr.setPinData(this.outPutParmPins[0], result, runId);
        if (fromExecute) {
            context.endExecute(this);
        }
        return this.next(
            context,
            runtimeDataMgr,
            _parmsArray,
            runner,
            enableDebugPause,
            runId,
            fromPin,
        );
    }
}
