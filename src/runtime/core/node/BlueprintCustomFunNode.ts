// Auto-generated from res/y.blueprint.js

import { BlueprintFactory } from "../BlueprintFactory";
import { BlueprintFunNode } from "./BlueprintFunNode";
import { BlueprintPinRuntime } from "../BlueprintPinRuntime";
import type { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import { BlueprintRuntime } from "../BlueprintRuntime";
import { BlueprintUtil } from "../BlueprintUtil";
import { EPinDirection, EPinType } from "../BlueprintDefs";
import type { BluePrintBlock } from "../BluePrintBlock";
import type { RuntimeDataManager } from "../RuntimeDataManager";

export class BlueprintCustomFunNode extends BlueprintFunNode {
    private _isCheck: boolean | undefined;
    public bpruntime: BlueprintRuntime | null;
    public funcode: string | undefined;
    public functionID: string | undefined;
    public inExecutes: BlueprintPinRuntime[];
    public inPutParmPins: BlueprintPinRuntime[];
    public isMember: boolean | undefined;
    public nativeFun: ((...args: unknown[]) => unknown) | null;
    public outExecutes: BlueprintPinRuntime[];
    public outPutParmPins: BlueprintPinRuntime[];
    public staticContext: BlueprintExecuteNode | null;
    public staticNext: BlueprintPinRuntime | null;
    constructor() {
        super();
        this.inExecutes = [];
        this.inPutParmPins = [];
        this.outPutParmPins = [];
        this.outExecutes = [];
        this.nativeFun = null;
        this.staticNext = null;
        this.bpruntime = null;
        this.staticContext = null;
    }

    public collectParam(
        context: BlueprintExecuteNode,
        runtimeDataMgr: RuntimeDataManager,
        inputPins: BlueprintPinRuntime[],
        runner: BluePrintBlock,
        runId: number,
        prePin: BlueprintPinRuntime | null,
    ) {
        this._checkFun();
        const parmsArray = super.collectParam(
            context,
            runtimeDataMgr,
            this.inPutParmPins,
            runner,
            runId,
            prePin,
        );
        context.parmFromOutPut(this.outPutParmPins, runtimeDataMgr, parmsArray);
        return parmsArray;
    }

    private _checkFun() {
        if (!this._isCheck) {
            this._isCheck = true;
            if (this.bpruntime) {
                const fun = this.functionID
                    ? this.bpruntime.funBlockMap.get(this.functionID)
                    : undefined;
                if (fun && fun.isStatic) {
                    this.isMember = false;
                } else {
                    this.staticContext = null;
                }
            }
        }
    }

    public onParseLinkData(node: { dataId?: unknown; target: string }, _manager: unknown) {
        const id = String(node.dataId);
        if (id) {
            this.functionID = id;
            this.isMember = true;
            const cls = BlueprintUtil.getClass(node.target) as
                | Record<PropertyKey, unknown>
                | undefined;
            if (cls) {
                const ctor = cls as Record<PropertyKey, unknown> & {
                    prototype: Record<PropertyKey, unknown>;
                };
                this.bpruntime = ctor.prototype[
                    BlueprintFactory.bpSymbol as PropertyKey
                ] as BlueprintRuntime;
                this.staticContext = ctor[
                    BlueprintFactory.contextSymbol as PropertyKey
                ] as BlueprintExecuteNode | null;
            }
        }
    }

    public executeFun(
        context: BlueprintExecuteNode,
        runtimeDataMgr: RuntimeDataManager,
        runner: BluePrintBlock,
        caller: unknown,
        parmsArray: unknown[],
        runId: number,
        fromPin: BlueprintPinRuntime,
    ) {
        let bpRuntime: BlueprintRuntime;
        let _funcContext: BlueprintExecuteNode;
        if (!this.isMember) {
            if (this.bpruntime == null || this.staticContext == null) {
                return null;
            }
            bpRuntime = this.bpruntime;
            _funcContext = this.staticContext;
        } else if (caller) {
            const host = caller as Record<PropertyKey, unknown>;
            if (host[BlueprintFactory.contextSymbol as PropertyKey]) {
                bpRuntime = host[BlueprintFactory.bpSymbol as PropertyKey] as BlueprintRuntime;
                _funcContext = host[BlueprintFactory.contextSymbol as PropertyKey] as BlueprintExecuteNode;
            } else {
                return null;
            }
        } else {
            return null;
        }
        let primise: Promise<void> | undefined;
        let cb: (() => void) | undefined;
        const result = bpRuntime.runCustomFun(
            _funcContext,
            this.functionID,
            parmsArray,
            () => {
                this._executeFun(_funcContext, cb, parmsArray, runner);
            },
            runId,
            this.inExecutes.indexOf(fromPin),
            this.outExecutes,
            runner,
            runtimeDataMgr,
        );
        if (result === false) {
            primise = new Promise((resolve, _reject) => {
                cb = resolve;
            });
            return primise;
        }
        return null;
    }

    private _executeFun(
        _context: BlueprintExecuteNode,
        cb: (() => void) | undefined,
        _parmsArray: unknown[],
        _runner: BluePrintBlock,
    ) {
        if (cb) {
            cb();
        }
    }

    public addPin(pin: BlueprintPinRuntime) {
        super.addPin(pin);
        if (pin.type == EPinType.Exec) {
            if (pin.direction == EPinDirection.Input) {
                this.inExecutes.push(pin);
            }
        }
    }

    public optimize() {
        this.staticNext = this.outExecutes[0];
    }

    public setFunction(
        fun: ((...args: unknown[]) => unknown) | null,
        isMember: boolean | undefined,
    ) {
        this.nativeFun = this.customFun;
        this.isMember = isMember;
        this.funcode = fun === null || fun === void 0 ? void 0 : fun.name;
    }

    public customFun(..._args: unknown[]): unknown {
        return undefined;
    }
}
