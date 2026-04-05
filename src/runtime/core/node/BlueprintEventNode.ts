// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import { BlueprintPinRuntime } from "../BlueprintPinRuntime";
import { BlueprintRuntimeBaseNode } from "./BlueprintRuntimeBaseNode";
import { BlueprintUtil } from "../BlueprintUtil";
import { EPinDirection, EPinType } from "../BlueprintDefs";
import type { BluePrintBlock } from "../BluePrintBlock";
import type { RuntimeDataManager } from "../RuntimeDataManager";
import type { RuntimeNodeData } from "../RuntimeNodeData";

export class BlueprintEventNode extends BlueprintRuntimeBaseNode {
    public eventName: string | undefined;
    public funcode: string | undefined;
    public isAnonymous: boolean | undefined;
    public isMember: boolean | undefined;
    public nativeFun: ((...args: unknown[]) => unknown) | null;
    public nid: string | number;
    public outExecute: BlueprintPinRuntime | null;
    public outExecutes: BlueprintPinRuntime[] | undefined;
    public outPutParmPins: BlueprintPinRuntime[];
    public staticNext: BlueprintPinRuntime | null;
    public tryExecute: BlueprintRuntimeBaseNode["tryExecute"];
    constructor() {
        super();
        this.tryExecute = this.emptyExecute;
    }

    public onParseLinkData(
        node: { dataId?: unknown; target: string; name?: string },
        manager: unknown,
    ) {
        if (node.dataId) {
            this.isAnonymous = true;
            this.eventName = BlueprintUtil.getConstDataById<{ name?: string }>(
                node.target,
                String(node.dataId),
            )?.name;
        } else {
            this.eventName = node.name;
        }
    }

    public setFunction(
        fun: ((...args: unknown[]) => unknown) | null,
        isMember: boolean | undefined,
    ) {
        this.nativeFun = null;
        this.isMember = isMember;
        this.funcode = fun === null || fun === void 0 ? void 0 : fun.name;
    }

    public emptyExecute(
        context: BlueprintExecuteNode,
        runtimeDataMgr: RuntimeDataManager,
        fromExecute: boolean,
        runner: BluePrintBlock,
        enableDebugPause: boolean,
        runId: number,
        fromPin: (BlueprintPinRuntime & { otype?: string }) | null,
    ) {
        if (fromPin && fromPin.otype == "bpFun") {
            let data = runtimeDataMgr.getDataById<RuntimeNodeData & { eventName?: string }>(
                this.nid,
            )!;
            let _this = this;
            data.eventName = this.eventName;
            let callFun = data.getCallFun(runId);
            if (!callFun) {
                callFun = function () {
                    let parms = Array.from(arguments);
                    let nextPin = _this.outExecute.linkTo[0];
                    if (nextPin) {
                        runner.runAnonymous(
                            context,
                            _this,
                            parms,
                            null,
                            runId,
                            0,
                            runner.getRunID(),
                            runtimeDataMgr,
                        );
                    }
                };
                data.setCallFun(runId, callFun);
            }
            runtimeDataMgr.setPinData(fromPin, callFun, runId);
        }
        return null;
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
        if (fromExecute) {
            context.endExecute(this);
        }
        return fromPin ? fromPin : this.staticNext;
    }

    public addPin(pin: BlueprintPinRuntime) {
        super.addPin(pin);
        if (pin.type == EPinType.Exec && pin.direction == EPinDirection.Output) {
            this.outExecute = pin;
            if (!this.outExecutes) {
                this.outExecutes = [];
            }
            this.outExecutes.push(pin);
        }
    }

    public optimize() {
        this.staticNext = this.outExecute;
    }

    public initData(runtimeDataMgr: RuntimeDataManager, parms: unknown[], curRunId: number) {
        this.outPutParmPins.forEach((value, index) => {
            runtimeDataMgr.setPinData(value, parms[index], curRunId);
        });
    }
}
