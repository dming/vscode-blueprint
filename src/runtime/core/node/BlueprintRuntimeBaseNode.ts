// Auto-generated from res/y.blueprint.js

import { BlueprintConst } from "../BlueprintConst";
import type { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import { BlueprintNode } from "../BlueprintNode";
import { BlueprintPinRuntime } from "../BlueprintPinRuntime";
import { BlueprintPromise } from "../BlueprintPromise";
import { EPinDirection, EPinType } from "../BlueprintDefs";
import type { BluePrintBlock } from "../BluePrintBlock";
import type { RuntimeDataManager } from "../RuntimeDataManager";
import type { BlueprintPinJson } from "../BlueprintPin";

/** Full `step` / `tryExecute` signature used across runtime nodes. */
export type BlueprintStepFn = (
    context: BlueprintExecuteNode,
    runtimeDataMgr: RuntimeDataManager,
    fromExecute: boolean,
    runner: BluePrintBlock,
    enableDebugPause: boolean,
    runId: number,
    fromPin: BlueprintPinRuntime | null,
    prePin: BlueprintPinRuntime | null,
) => unknown;

export class BlueprintRuntimeBaseNode extends BlueprintNode {
    private _refNumber: number | undefined;
    public funcode: string | undefined;
    public inPutParmPins: BlueprintPinRuntime[];
    public isMember: boolean | undefined;
    public nativeFun: ((...args: unknown[]) => unknown) | null;
    /** Present on most executable runtime nodes; used by flow optimization. */
    public outExecutes?: BlueprintPinRuntime[];
    public outPutParmPins: BlueprintPinRuntime[];
    public returnValue: BlueprintPinRuntime | null;
    public tryExecute: BlueprintStepFn;
    public static _EMPTY: BlueprintPinRuntime[] = [];
    constructor() {
        super();
        this.inPutParmPins = BlueprintRuntimeBaseNode._EMPTY;
        this.outPutParmPins = BlueprintRuntimeBaseNode._EMPTY;
        this.tryExecute = this.step;
        this.nativeFun = null;
        this.returnValue = null;
    }

    public addRef() {
        if (this._refNumber == undefined) {
            this._refNumber = 0;
        }
        this._refNumber++;
    }

    public getRef() {
        return this._refNumber;
    }

    public emptyExecute(
        _context: BlueprintExecuteNode,
        _runtimeDataMgr: RuntimeDataManager,
        _fromExecute: boolean,
        _runner: BluePrintBlock,
        _enableDebugPause: boolean,
        _runId: number,
        _fromPin: BlueprintPinRuntime | null,
    ) {
        return null;
    }

    public createPin(def: BlueprintPinJson) {
        const pin = new BlueprintPinRuntime();
        pin.parse(def);
        return pin;
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
        const nf = this.nativeFun;
        if (nf == null) {
            return undefined;
        }
        return context.executeFun(nf, this.returnValue, runtimeDataMgr, caller, parmsArray, runId);
    }

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
            throw new Error(`collectParam: missing RuntimeNodeData for nid ${String(this.nid)}`);
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
                if (!context.readCache) {
                    from.step(context, runtimeDataMgr, runner, runId, prePin);
                }
                context.parmFromOtherPin(curInput, runtimeDataMgr, from, _parmsArray, runId);
            } else {
                context.parmFromSelf(curInput, runtimeDataMgr, _parmsArray, runId);
            }
        }
        context.readCache = false;
        return _parmsArray;
    }

    private _checkRun(parmsArray: unknown[]) {
        let promiseList: Promise<unknown>[] | undefined;
        parmsArray.forEach((parm) => {
            if (parm instanceof Promise) {
                if (!promiseList) promiseList = [];
                promiseList.push(parm);
            }
        });
        if (promiseList) {
            return Promise.all(promiseList);
        } else {
            return null;
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
    ): unknown {
        const _parmsArray = this.collectParam(
            context,
            runtimeDataMgr,
            this.inPutParmPins,
            runner,
            runId,
            prePin,
        );
        if (this.outPutParmPins.length > 1) {
            context.parmFromOutPut(this.outPutParmPins, runtimeDataMgr, _parmsArray);
            context.parmFromCustom(_parmsArray, runId, "runId");
        }
        const promise = this._checkRun(_parmsArray);
        if (promise) {
            const bPromise = BlueprintPromise.create();
            if (this.returnValue) {
                runtimeDataMgr.setPinData(this.returnValue, promise, runId);
            }
            promise.then((_value) => {
                if (bPromise.hasCallBack()) {
                    bPromise.nid = this.nid;
                    bPromise.pin = fromPin;
                    bPromise.prePin = prePin;
                    context.readCache = true;
                    bPromise.complete();
                } else {
                    context.readCache = true;
                    this.step(
                        context,
                        runtimeDataMgr,
                        fromExecute,
                        runner,
                        enableDebugPause,
                        runId,
                        fromPin,
                        prePin,
                    );
                }
                bPromise.recover();
            });
            return bPromise;
        }
        const result =
            fromExecute &&
            context.beginExecute(this, runner, enableDebugPause, fromPin, _parmsArray, prePin);
        if (result) {
            return result;
        }
        if (this.nativeFun) {
            let caller = null;
            if (this.isMember) {
                const temp = _parmsArray.shift();
                this.checkTarget(temp);
                caller = temp === undefined ? context.getSelf() : temp;
            }
            const result = this.executeFun(
                context,
                runtimeDataMgr,
                runner,
                caller,
                _parmsArray,
                runId,
                fromPin,
            );
            if (result instanceof Promise) {
                const promise = BlueprintPromise.create();
                result.then((value) => {
                    if (this.returnValue) {
                        runtimeDataMgr.setPinData(this.returnValue, value, runId);
                    }
                    let pin = this.next(
                        context,
                        runtimeDataMgr,
                        _parmsArray,
                        runner,
                        enableDebugPause,
                        runId,
                        fromPin,
                    ) as BlueprintPinRuntime | null | undefined;
                    if (pin) {
                        pin = pin.linkTo[0];
                        promise.nid = pin ? pin.owner.nid : BlueprintConst.NULL_NODE;
                    }
                    promise.pin = pin ?? null;
                    promise.prePin = prePin;
                    promise.complete();
                    promise.recover();
                });
                return promise;
            }
        }
        if (fromExecute) {
            context.endExecute(this);
        }
        return this.next(context, runtimeDataMgr, _parmsArray, runner, true, runId, fromPin);
    }

    public checkTarget(temp: unknown) {
        if (temp === undefined) {
            const pin = this.inPutParmPins.filter(
                (pin) => pin.nid == "-2" && pin.linkTo.length > 0,
            )[0];
            if (pin) {
                throw new Error(`target of '${this.name}' is null`);
            }
        }
    }

    public next(
        _context: BlueprintExecuteNode,
        _runtimeDataMgr: RuntimeDataManager,
        _parmsArray: unknown[],
        _runner: BluePrintBlock,
        _enableDebugPause: boolean,
        _runId: number,
        _fromPin: BlueprintPinRuntime | null,
    ): unknown {
        return null;
    }

    public addPin(pin: BlueprintPinRuntime) {
        pin.owner = this;
        super.addPin(pin);
        if (pin.type == EPinType.Other) {
            switch (pin.direction) {
                case EPinDirection.Input:
                    if (this.inPutParmPins == BlueprintRuntimeBaseNode._EMPTY) {
                        this.inPutParmPins = [];
                    }
                    this.inPutParmPins.push(pin);
                    break;
                case EPinDirection.Output:
                    if (this.outPutParmPins == BlueprintRuntimeBaseNode._EMPTY) {
                        this.outPutParmPins = [];
                    }
                    this.outPutParmPins.push(pin);
                    if (this.outPutParmPins.length == 1) {
                        this.returnValue = pin;
                    } else {
                        this.returnValue = null;
                    }
                    break;
            }
        }
    }

    public optimize() {}

    public setFunction(
        fun: ((...args: unknown[]) => unknown) | null,
        isMember: boolean | undefined,
    ) {
        this.nativeFun = fun;
        this.isMember = isMember;
        this.funcode = fun === null || fun === void 0 ? void 0 : fun.name;
    }

    public addNextPIn() {}
}
