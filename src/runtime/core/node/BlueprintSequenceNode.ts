// Auto-generated from res/y.blueprint.js

import type { BlueprintExecuteNode } from "../BlueprintExecuteNode";
import { BlueprintComplexNode } from "./BlueprintComplexNode";
import { BlueprintConst } from "../BlueprintConst";
import type { BlueprintPinRuntime } from "../BlueprintPinRuntime";
import { BlueprintPromise } from "../BlueprintPromise";
import type { BluePrintBlock } from "../BluePrintBlock";
import type { RuntimeDataManager } from "../RuntimeDataManager";

export class BlueprintSequenceNode extends BlueprintComplexNode {
    public outExecutes: BlueprintPinRuntime[];
    public next(
        context: BlueprintExecuteNode,
        runtimeDataMgr: RuntimeDataManager,
        parmsArray: unknown[],
        runner: BluePrintBlock,
        enableDebugPause: boolean,
        runId: number,
        _fromPin: BlueprintPinRuntime | null,
    ): BlueprintPromise | null {
        let arr = [];
        for (let i = 0, n = this.outExecutes.length; i < n; i++) {
            let item = this.outExecutes[i];
            let pin = item.linkTo[0];
            if (pin) {
                let cb;
                let result;
                if (context.debuggerPause) {
                    result = false;
                    let callback = (owner) => {
                        if (context.debuggerPause) {
                            context.pushBack(owner, callback);
                        } else {
                            result = runner.runByContext(
                                context,
                                runtimeDataMgr,
                                owner,
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
                    let promise = new Promise((resolve) => {
                        cb = resolve;
                    });
                    arr.push(promise);
                }
            }
        }
        if (arr.length > 0) {
            let promise = BlueprintPromise.create();
            Promise.all(arr).then((value) => {
                promise.nid = BlueprintConst.NULL_NODE;
                promise.complete();
                promise.recover();
            });
            return promise;
        } else {
            return null;
        }
    }

    public setFunction(fun) {}
}
