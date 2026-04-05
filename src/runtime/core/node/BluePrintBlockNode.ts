// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import { BlueprintComplexNode } from "./BlueprintComplexNode";
import { BlueprintPinRuntime } from "../BlueprintPinRuntime";
import { BlueprintPromise } from "../BlueprintPromise";
import type { BluePrintBlock } from "../BluePrintBlock";
import type { RuntimeDataManager } from "../RuntimeDataManager";

export class BluePrintBlockNode extends BlueprintComplexNode {
    public deal: (...args: unknown[]) => unknown;
    public funcode: string | undefined;
    public inExecutes: BlueprintPinRuntime[];
    public nativeFun: ((...args: unknown[]) => unknown) | null;
    public outExecutes: BlueprintPinRuntime[];
    public outPutParmPins: BlueprintPinRuntime[];
    public next(
        context: BlueprintExecuteNode,
        runtimeDataMgr: RuntimeDataManager,
        parmsArray: unknown[],
        runner: BluePrintBlock,
        enableDebugPause: boolean,
        runId: number,
        fromPin: BlueprintPinRuntime | null,
    ): BlueprintPinRuntime | BlueprintPromise | null {
        let result = this.deal(
            fromPin,
            this.inExecutes,
            this.outExecutes,
            this.outPutParmPins,
            context,
            runner,
            runtimeDataMgr,
            runId,
            ...parmsArray,
        );
        return result as BlueprintPinRuntime | BlueprintPromise | null;
    }

    public setFunction(fun: (...args: unknown[]) => unknown) {
        this.nativeFun = null;
        this.funcode = fun === null || fun === void 0 ? void 0 : fun.name;
        this.deal = fun;
    }
}
