// Auto-generated from res/y.blueprint.js

import { BluePrintComplexBlock } from "./BluePrintComplexBlock";
import { BlueprintAutoRun } from "./BlueprintAutoRun";
import { BlueprintFactory, type BlueprintNodeConstructor } from "./BlueprintFactory";
import type { BlueprintExecuteNode } from "./BlueprintExecuteNode";
import type { BlueprintEventNode } from "./node/BlueprintEventNode";
import type { BlueprintRunBase } from "./BlueprintRunBase";
import type { BlueprintRuntimeBaseNode } from "./node/BlueprintRuntimeBaseNode";
import type { BluePrintEventBlock } from "./BluePrintEventBlock";
import { BlueprintUtil } from "./BlueprintUtil";
import { BPType, EBlockSource } from "./BlueprintDefs";
import type { BlueprintGraphItemJson } from "./BlueprintFactory";

export class BluePrintMainBlock extends BluePrintComplexBlock {
    public autoAnonymousfuns: BlueprintEventNode[];
    public autoRunNodes: BlueprintRuntimeBaseNode[];
    public cls: BlueprintNodeConstructor;
    public eventBlockMap: Map<string, BluePrintEventBlock>;
    public eventMap: Map<string, BlueprintEventNode>;
    constructor(id: string | number) {
        super(id);
        this.eventMap = new Map();
        this.autoAnonymousfuns = [];
        this.autoRunNodes = [];
        this.eventBlockMap = new Map();
    }

    public get bpName() {
        return BlueprintUtil.getNameByUUID(this.name);
    }

    public get blockSourceType() {
        return EBlockSource.Main;
    }

    public optimize() {
        super.optimize();
        this.initEventBlockMap(this.eventMap, this.eventBlockMap);
        this.eventBlockMap.forEach((value) => {
            value.optimizeByBlockMap(this);
        });
        this.anonymousBlockMap.forEach((value) => {
            this.eventBlockMap.set(String(value.id), value);
        });
        for (let i = 0, n = this.autoRunNodes.length; i < n; i++) {
            let item = this.autoRunNodes[i];
            let hasLink = false;
            for (let j = 0, m = item.outPutParmPins.length; j < m; j++) {
                let pin = item.outPutParmPins[j];
                if (pin.linkTo.length > 0) {
                    hasLink = true;
                    break;
                }
            }
            if (hasLink) {
                this.autoRunNodes.splice(i, 1);
                i--;
                n--;
            }
        }
    }

    public onEventParse(eventName: string) {
        let originFunc = this.cls.prototype[eventName];
        let _this = this;
        this.cls.prototype[eventName] = function (...args) {
            let _a;
            const funcContext = this[BlueprintFactory.contextSymbol];
            if (
                (_a = funcContext.debuggerManager) === null || _a === void 0 ? void 0 : _a.debugging
            )
                return null;
            const eventNode = _this.eventMap.get(eventName);
            if (eventNode.def.isAsync) {
                let p;
                if (originFunc) p = Promise.resolve(originFunc.apply(this, args));
                else p = Promise.resolve();
                return p.then(
                    () =>
                        new Promise((resolve) => {
                            this[BlueprintFactory.bpSymbol].run(
                                funcContext,
                                eventNode,
                                args,
                                resolve,
                            );
                        }),
                );
            } else {
                originFunc && originFunc.apply(this, args);
                this[BlueprintFactory.bpSymbol].run(funcContext, eventNode, args, null);
                return null;
            }
        };
    }

    public append(node: BlueprintRuntimeBaseNode, item: BlueprintGraphItemJson) {
        super.append(node, item);
        switch (node.type) {
            case BPType.Pure:
                if (node instanceof BlueprintAutoRun) {
                    this.autoRunNodes.push(node);
                }
                break;
            case BPType.Event:
                if (!item.dataId) {
                    this.eventMap.set(node.name, node as unknown as BlueprintEventNode);
                } else if (item.dataId && item.autoReg) {
                    this.autoAnonymousfuns.push(node as unknown as BlueprintEventNode);
                }
                break;
        }
    }

    public runAuto(context: BlueprintExecuteNode) {
        context.initData(this.id, this.nodeMap, this.localVarMap);
        let id = this.getRunID();
        for (let i = 0, n = this.autoRunNodes.length; i < n; i++) {
            let item = this.autoRunNodes[i];
            item.step(
                context,
                context.getDataManagerByID(this.id),
                true,
                this,
                true,
                id,
                null,
                null,
            );
        }
    }

    public run(
        context: BlueprintExecuteNode,
        event: BlueprintEventNode,
        parms: unknown[] | null,
        cb: (() => void) | null,
        runId: number,
        execId: number,
    ) {
        context.initData(this.id, this.nodeMap, this.localVarMap);
        return this.eventBlockMap
            .get(String(event.nid))
            .run(context, event, parms, cb, runId, execId);
    }

    public finishChild(context: BlueprintExecuteNode, runtime: BlueprintRunBase) {
        context.finish(runtime);
    }
}
