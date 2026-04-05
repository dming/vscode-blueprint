// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "./BlueprintExecuteNode";
import { BlueprintPin } from "./BlueprintPin";
import type { BlueprintRuntimeBaseNode } from "./node/BlueprintRuntimeBaseNode";
import type { BluePrintBlock } from "./BluePrintBlock";
import type { RuntimeDataManager } from "./RuntimeDataManager";

export class BlueprintPinRuntime extends BlueprintPin {
    public declare linkTo: BlueprintPinRuntime[];
    public owner!: BlueprintRuntimeBaseNode;
    public value: unknown;
    public step(
        context: BlueprintExecuteNode,
        runtimeDataMgr: RuntimeDataManager,
        runner: BluePrintBlock,
        runId: number,
        prePin: BlueprintPinRuntime | null,
    ) {
        return this.owner.tryExecute(
            context,
            runtimeDataMgr,
            false,
            runner,
            true,
            runId,
            this,
            prePin,
        );
    }

    public execute(
        context: BlueprintExecuteNode,
        runtimeDataMgr: RuntimeDataManager,
        runner: BluePrintBlock,
        runId: number,
    ) {
        const nextPin = this.linkTo[0];
        const index =
            nextPin === null || nextPin === void 0
                ? void 0
                : nextPin.owner.step(
                      context,
                      runtimeDataMgr,
                      true,
                      runner,
                      true,
                      runId,
                      nextPin,
                      this,
                  );
        return index;
    }

    public getValueCode() {
        return typeof this.value == "string" ? '"' + this.value + '"' : this.value;
    }
}
