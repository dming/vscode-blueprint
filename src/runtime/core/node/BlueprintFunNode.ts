// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import { BlueprintRuntimeBaseNode } from "./BlueprintRuntimeBaseNode";
import { BlueprintPinRuntime } from "../BlueprintPinRuntime";
import { BlueprintUtil } from "../BlueprintUtil";
import { BPType, EPinDirection, EPinType } from "../BlueprintDefs";
import type { BluePrintBlock } from "../BluePrintBlock";
import type { RuntimeDataManager } from "../RuntimeDataManager";
import type { BlueprintNativeCallable } from "../BlueprintDataTypes";

export class BlueprintFunNode extends BlueprintRuntimeBaseNode {
    public emptyExecute: BlueprintRuntimeBaseNode["emptyExecute"];
    public eventName: string | undefined;
    public inExecute: BlueprintPinRuntime | null;
    public outExecute: BlueprintPinRuntime | null;
    public outExecutes: BlueprintPinRuntime[] | undefined;
    public staticNext: BlueprintPinRuntime | null;
    public tryExecute: BlueprintRuntimeBaseNode["tryExecute"];
    public type: BPType | string;
    constructor() {
        super();
        this.emptyExecute = super.emptyExecute.bind(this) as BlueprintRuntimeBaseNode["emptyExecute"];
        this.type = BPType.Pure;
        this.tryExecute = this.emptyExecute;
        this.inExecute = null;
        this.outExecute = null;
        this.staticNext = null;
    }

    public onParseLinkData(node: { dataId?: unknown; target: string }, _manager: unknown) {
        if (node.dataId) {
            this.eventName = BlueprintUtil.getConstDataById<{ name?: string }>(
                node.target,
                String(node.dataId),
            )?.name;
            this.executeFun = this.executeHookFun;
        }
    }

    public executeHookFun(
        context: BlueprintExecuteNode,
        runtimeDataMgr: RuntimeDataManager,
        runner: BluePrintBlock,
        caller: unknown,
        parmsArray: unknown[],
        runId: number,
        _fromPin: BlueprintPinRuntime | null,
    ) {
        parmsArray.unshift(this.eventName);
        if (!this.nativeFun) {
            return null;
        }
        return context.executeFun(
            this.nativeFun as BlueprintNativeCallable,
            this.returnValue,
            runtimeDataMgr,
            caller,
            parmsArray,
            runId,
        );
    }

    public executeFun(
        context: BlueprintExecuteNode,
        runtimeDataMgr: RuntimeDataManager,
        runner: BluePrintBlock,
        caller: unknown,
        parmsArray: unknown[],
        runId: number,
        _fromPin: BlueprintPinRuntime | null,
    ) {
        if (caller && this.type == BPType.Function) {
            const fn = (caller as Record<string, unknown>)[this.name] as
                | ((...args: unknown[]) => unknown)
                | null
                | undefined;
            this.nativeFun = fn === undefined ? null : fn;
        }
        if (!this.nativeFun) {
            console.warn(`failed to call '${this.name}'`);
            return null;
        }
        return context.executeFun(
            this.nativeFun as BlueprintNativeCallable,
            this.returnValue,
            runtimeDataMgr,
            caller,
            parmsArray,
            runId,
        );
    }

    public next() {
        return this.staticNext;
    }

    public addPin(pin: BlueprintPinRuntime) {
        super.addPin(pin);
        if (pin.type == EPinType.Exec) {
            if (pin.direction == EPinDirection.Input) {
                this.inExecute = pin;
            } else if (pin.direction == EPinDirection.Output) {
                this.outExecute = pin;
                if (!this.outExecutes) {
                    this.outExecutes = [];
                }
                this.outExecutes.push(pin);
            }
        }
    }

    public optimize() {
        this.staticNext = this.outExecute;
    }
}
