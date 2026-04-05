// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import { BlueprintComplexNode } from "./BlueprintComplexNode";
import { BlueprintConst } from "../BlueprintConst";
import type { BlueprintPinRuntime } from "../BlueprintPinRuntime";
import { BlueprintPromise } from "../BlueprintPromise";
import type { BluePrintBlock } from "../BluePrintBlock";
import type { RuntimeDataManager } from "../RuntimeDataManager";

export class BlueprintSequenceNode extends BlueprintComplexNode {
    public next(
        context: BlueprintExecuteNode,
        runtimeDataMgr: RuntimeDataManager,
        parmsArray: unknown[],
        runner: BluePrintBlock,
        enableDebugPause: boolean,
        runId: number,
        _fromPin: BlueprintPinRuntime | null,
    ): BlueprintPromise | null {
        const arr: Promise<unknown>[] = [];
        for (let i = 0, n = this.outExecutes.length; i < n; i++) {
            const item = this.outExecutes[i];
            const pin = item.linkTo[0];
            if (pin) {
                let cb: ((value?: unknown) => void) | undefined;
                let result: boolean | undefined;
                if (context.debuggerPause) {
                    result = false;
                    const callback = (owner?: unknown) => {
                        if (context.debuggerPause) {
                            context.pushBack(owner, callback);
                        } else {
                            result = runner.runByContext(
                                context,
                                runtimeDataMgr,
                                owner as BlueprintPinRuntime["owner"],
                                enableDebugPause,
                                () => {
                                    if (result === false && cb) {
                                        cb();
                                    }
                                },
                                runId,
                                pin,
                                item,
                                true,
                            );
                            if (result && cb) {
                                cb();
                            }
                        }
                    };
                    context.pushBack(pin.owner, callback);
                } else {
                    result = runner.runByContext(
                        context,
                        runtimeDataMgr,
                        pin.owner,
                        enableDebugPause,
                        () => {
                            if (result === false && cb) {
                                cb();
                            }
                        },
                        runId,
                        pin,
                        item,
                        true,
                    );
                }
                if (result === false) {
                    const promise = new Promise((resolve) => {
                        cb = resolve;
                    });
                    arr.push(promise);
                }
            }
        }
        if (arr.length > 0) {
            const promise = BlueprintPromise.create();
            Promise.all(arr).then((_value) => {
                promise.nid = BlueprintConst.NULL_NODE;
                promise.complete();
                promise.recover();
            });
            return promise;
        } else {
            return null;
        }
    }

    public setFunction(_fun: unknown) {}
}
