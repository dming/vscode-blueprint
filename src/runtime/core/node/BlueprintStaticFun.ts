// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import { BlueprintFactory } from "../BlueprintFactory";
import { BlueprintPinRuntime } from "../BlueprintPinRuntime";
import { ExpressParse } from "../ExpressParse";
import type { BluePrintBlock } from "../BluePrintBlock";
import type { RuntimeDataManager } from "../RuntimeDataManager";
import { ERunStat } from "../ambient";

export class BlueprintStaticFun {
    public static branch(outExecutes: BlueprintPinRuntime[], input: unknown) {
        return input ? outExecutes[0] : outExecutes[1];
    }

    public static switchFun(outExecutes: BlueprintPinRuntime[], input: unknown) {
        return (
            outExecutes.find((item) => item.nid == input) ||
            outExecutes.find((item) => item.nid == "default")
        );
    }

    public static getTempVar(name: string, runtimeDataMgr: RuntimeDataManager, runId: number) {
        return runtimeDataMgr.getVar(name, runId);
    }

    public static setTempVar(
        value: unknown,
        name: string,
        runtimeDataMgr: RuntimeDataManager,
        runId: number,
    ) {
        return runtimeDataMgr.setVar(name, value, runId);
    }

    public static getVariable(target: unknown, name: string, context: BlueprintExecuteNode) {
        if (!target) {
            return context.getVar(name);
        } else {
            const bag = target as Record<PropertyKey, unknown>;
            const realContext = bag[BlueprintFactory.contextSymbol] as
                | { getVar: (n: string) => unknown }
                | undefined;
            if (realContext) {
                return realContext.getVar(name);
            } else {
                return (target as Record<string, unknown>)[name];
            }
        }
    }

    public static getSelf(_name: string, context: BlueprintExecuteNode) {
        return context.getSelf();
    }

    public static setVariable(
        target: unknown,
        value: unknown,
        name: string,
        context: BlueprintExecuteNode,
    ) {
        if (!target) {
            context.setVar(name, value);
        } else {
            const bag = target as Record<PropertyKey, unknown>;
            const realContext = bag[BlueprintFactory.contextSymbol] as
                | { setVar: (n: string, v: unknown) => void }
                | undefined;
            if (realContext) {
                realContext.setVar(name, value);
            } else {
                (target as Record<string, unknown>)[name] = value;
            }
        }
        return value;
    }

    public static expression() {
        return true;
    }

    public static typeInstanceof(
        outExecutes: BlueprintPinRuntime[],
        target: unknown,
        type: string | (new (...args: unknown[]) => unknown),
    ) {
        let b;
        if (typeof type == "string") {
            b = typeof target == type;
        } else {
            b = target instanceof type;
        }
        return b ? outExecutes[0] : outExecutes[1];
    }

    public static runBranch(
        nextExec: BlueprintPinRuntime,
        outPutParmPins: BlueprintPinRuntime[],
        parms: unknown[],
        context: BlueprintExecuteNode,
        runner: BluePrintBlock,
        runtimeDataMgr: RuntimeDataManager,
        prePin: BlueprintPinRuntime | null,
        runId: number,
    ) {
        const curRunId = runner.getRunID();
        parms.forEach((item, index) => {
            runtimeDataMgr.setPinData(outPutParmPins[index], item, curRunId);
        });
        runtimeDataMgr.saveContextData(runId, curRunId);
        runner.runByContext(
            context,
            runtimeDataMgr,
            nextExec.owner,
            true,
            null,
            curRunId,
            nextExec,
            prePin,
        );
    }

    public static forEach(
        inputExecute: BlueprintPinRuntime,
        inputExecutes: BlueprintPinRuntime[],
        outExecutes: BlueprintPinRuntime[],
        outPutParmPins: BlueprintPinRuntime[],
        context: BlueprintExecuteNode,
        runner: BluePrintBlock,
        runtimeDataMgr: RuntimeDataManager,
        runId: number,
        array: unknown[],
    ) {
        const nextPin = outExecutes[0].linkTo[0];
        if (nextPin) {
            array.forEach((item, index) => {
                BlueprintStaticFun.runBranch(
                    nextPin,
                    outPutParmPins,
                    [item, index],
                    context,
                    runner,
                    runtimeDataMgr,
                    outExecutes[0],
                    runId,
                );
            });
        }
        return outExecutes[1].execute(context, runtimeDataMgr, runner, runId);
    }

    public static forEachWithBreak(
        inputExecute: BlueprintPinRuntime,
        inputExecutes: BlueprintPinRuntime[],
        outExecutes: BlueprintPinRuntime[],
        outPutParmPins: BlueprintPinRuntime[],
        context: BlueprintExecuteNode,
        runner: BluePrintBlock,
        runtimeDataMgr: RuntimeDataManager,
        runId: number,
        array: unknown[],
    ) {
        let breakNode;
        if (inputExecute == inputExecutes[1]) {
            breakNode = runtimeDataMgr.getRuntimePinById(inputExecute.id);
            if (!breakNode) {
                return null;
            }
            if (breakNode.getValue(runId) == ERunStat.running) {
                breakNode.initValue(ERunStat.break);
            }
            return null;
        }
        breakNode = runtimeDataMgr.getRuntimePinById(inputExecutes[1].id);
        if (!breakNode) {
            return null;
        }
        breakNode.initValue(ERunStat.running);
        const nextPin = outExecutes[0].linkTo[0];
        if (nextPin) {
            for (let i = 0; i < array.length; i++) {
                BlueprintStaticFun.runBranch(
                    nextPin,
                    outPutParmPins,
                    [array[i], i],
                    context,
                    runner,
                    runtimeDataMgr,
                    outExecutes[0],
                    runId,
                );
                if (breakNode.getValue(runId) == ERunStat.break) {
                    break;
                }
            }
        }
        breakNode.initValue(ERunStat.end);
        return outExecutes[1].execute(context, runtimeDataMgr, runner, runId);
    }

    public static forLoop(
        _inputExecute: BlueprintPinRuntime,
        _inputExecutes: BlueprintPinRuntime[],
        outExecutes: BlueprintPinRuntime[],
        outPutParmPins: BlueprintPinRuntime[],
        context: BlueprintExecuteNode,
        runner: BluePrintBlock,
        runtimeDataMgr: RuntimeDataManager,
        runId: number,
        firstIndex: number,
        lastIndex: number,
        step = 1,
    ) {
        if (step <= 0) step = 1;
        const nextPin = outExecutes[0].linkTo[0];
        if (nextPin) {
            for (let i = firstIndex; i < lastIndex; i += step) {
                BlueprintStaticFun.runBranch(
                    nextPin,
                    outPutParmPins,
                    [i],
                    context,
                    runner,
                    runtimeDataMgr,
                    outExecutes[0],
                    runId,
                );
            }
        }
        return outExecutes[1].execute(context, runtimeDataMgr, runner, runId);
    }

    public static forLoopWithBreak(
        inputExecute: BlueprintPinRuntime,
        inputExecutes: BlueprintPinRuntime[],
        outExecutes: BlueprintPinRuntime[],
        outPutParmPins: BlueprintPinRuntime[],
        context: BlueprintExecuteNode,
        runner: BluePrintBlock,
        runtimeDataMgr: RuntimeDataManager,
        runId: number,
        firstIndex: number,
        lastIndex: number,
        step = 1,
    ) {
        let breakNode;
        if (inputExecute == inputExecutes[1]) {
            breakNode = runtimeDataMgr.getRuntimePinById(inputExecute.id);
            if (!breakNode) {
                return null;
            }
            if (breakNode.getValue(runId) == ERunStat.running) {
                breakNode.initValue(ERunStat.break);
            }
            return null;
        } else {
            breakNode = runtimeDataMgr.getRuntimePinById(inputExecutes[1].id);
            if (!breakNode) {
                return null;
            }
            breakNode.initValue(ERunStat.running);
            if (step <= 0) step = 1;
            const nextPin = outExecutes[0].linkTo[0];
            if (nextPin) {
                for (let i = firstIndex; i < lastIndex; i += step) {
                    BlueprintStaticFun.runBranch(
                        nextPin,
                        outPutParmPins,
                        [i],
                        context,
                        runner,
                        runtimeDataMgr,
                        outExecutes[0],
                        runId,
                    );
                    if (breakNode.getValue(runId) == ERunStat.break) {
                        break;
                    }
                }
            }
            breakNode.initValue(ERunStat.end);
            return outExecutes[1].execute(context, runtimeDataMgr, runner, runId);
        }
    }

    public static print(str: unknown) {
        console.log(str);
    }

    public static waitTime(second: number) {
        return new Promise((resolve, _reject) => {
            setTimeout(() => {
                resolve(true);
            }, second * 1000);
        });
    }

    public static sleep(time: number) {
        return new Promise((resolve, _reject) => {
            setTimeout(() => {
                resolve(undefined);
            }, time);
        });
    }

    public static runExpress(express: string, a: unknown, b: unknown, c: unknown) {
        const expressTree = ExpressParse.instance.parse(express);
        const context = { a: a, b: b, c: c, Math: Math };
        if (!expressTree) {
            return undefined;
        }
        return expressTree.call(context);
    }

    public static destroy(obj: { destroy?: () => void } | null | undefined) {
        if (obj?.destroy) {
            obj.destroy();
        }
    }
}
