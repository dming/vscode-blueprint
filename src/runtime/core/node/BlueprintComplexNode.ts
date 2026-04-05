// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import { BlueprintPinRuntime } from "../BlueprintPinRuntime";
import { BlueprintPromise } from "../BlueprintPromise";
import { BlueprintRuntimeBaseNode } from "./BlueprintRuntimeBaseNode";
import { EPinDirection, EPinType } from "../BlueprintDefs";
import type { BluePrintBlock } from "../BluePrintBlock";
import type { RuntimeDataManager } from "../RuntimeDataManager";

export class BlueprintComplexNode extends BlueprintRuntimeBaseNode {
    public emptyExecute: BlueprintRuntimeBaseNode["emptyExecute"];
    public find: (outExecutes: BlueprintPinRuntime[], ...parms: unknown[]) => BlueprintPinRuntime;
    public funcode: string | undefined;
    public inExecutes: BlueprintPinRuntime[];
    public nativeFun: ((...args: unknown[]) => unknown) | null;
    public outExecutes: BlueprintPinRuntime[];
    public tryExecute: BlueprintRuntimeBaseNode["tryExecute"];
    constructor() {
        super();
        this.inExecutes = [];
        this.outExecutes = [];
        this.nativeFun = null;
        this.emptyExecute = super.emptyExecute.bind(this) as BlueprintRuntimeBaseNode["emptyExecute"];
        this.find = (out) => out[0]!;
        this.tryExecute = this.emptyExecute;
    }

    public next(
        context: BlueprintExecuteNode,
        runtimeDataMgr: RuntimeDataManager,
        parmsArray: unknown[],
        _runner: BluePrintBlock,
        _enableDebugPause: boolean,
        _runId: number,
        _fromPin: BlueprintPinRuntime | null,
    ): BlueprintPinRuntime | BlueprintPromise | null {
        const result = this.find(this.outExecutes, ...parmsArray);
        if (result.linkTo.length) {
            return result;
        }
        return null;
    }

    public addPin(pin: BlueprintPinRuntime) {
        super.addPin(pin);
        if (pin.type == EPinType.Exec) {
            if (pin.direction == EPinDirection.Input) {
                this.inExecutes.push(pin);
            } else if (pin.direction == EPinDirection.Output) {
                this.outExecutes.push(pin);
            }
        }
    }

    public setFunction(
        fun: BlueprintComplexNode["find"] | ((...args: unknown[]) => unknown) | null | undefined,
    ) {
        this.nativeFun = null;
        const f = fun as { name?: string } | null | undefined;
        this.funcode = f === null || f === void 0 ? void 0 : f.name;
        this.find = fun as BlueprintComplexNode["find"];
    }
}
