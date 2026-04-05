// Auto-generated from res/y.blueprint.js

import { BlueprintConst } from "./BlueprintConst";
import type { BlueprintExecuteNode } from "./BlueprintExecuteNode";
import type { BlueprintEventNode } from "./node/BlueprintEventNode";
import type { BlueprintNode } from "./BlueprintNode";
import { BlueprintPinRuntime } from "./BlueprintPinRuntime";
import { BlueprintPromise } from "./BlueprintPromise";
import type { BluePrintEventBlock } from "./BluePrintEventBlock";
import type { BlueprintRuntimeBaseNode } from "./node/BlueprintRuntimeBaseNode";
import { EBlockSource } from "./BlueprintDefs";
import type { RuntimeDataManager } from "./RuntimeDataManager";
import type { BlueprintJsonItem } from "./BlueprintJsonTypes";
import type { BlueprintGraphItemJson } from "./BlueprintFactory";

export class BluePrintBlock {
    private _maxID: number;
    public anonymousBlockMap: Map<string, BluePrintEventBlock>;
    public anonymousfunMap: Map<string | number, BlueprintNode>;
    public executeList: BlueprintRuntimeBaseNode[];
    public hasRefAnony: boolean | undefined;
    public id: string | number;
    public idToIndex: Map<string | number, number>;
    public name: string;
    public nodeMap: Map<string | number, BlueprintNode>;
    public poolIds: number[];
    public get blockSourceType() {
        return EBlockSource.Unknown;
    }

    constructor(id: string | number) {
        this.id = id;
        this._maxID = 0;
        this.executeList = [];
        this.idToIndex = new Map();
        this.idToIndex.set(BlueprintConst.NULL_NODE, BlueprintConst.MAX_CODELINE);
        this.nodeMap = new Map();
        this.poolIds = [];
        this.anonymousfunMap = new Map();
        this.anonymousBlockMap = new Map();
    }

    public getDataManagerByID(context: BlueprintExecuteNode) {
        return context.getDataManagerByID(this.id);
    }

    public get bpId() {
        return this.name;
    }

    public getNodeById(id: string | number) {
        return this.nodeMap.get(id);
    }

    private _addNode(value: BlueprintRuntimeBaseNode, executeAbleList: BlueprintRuntimeBaseNode[]) {
        if (executeAbleList.indexOf(value) == -1) {
            this.idToIndex.set(value.nid, executeAbleList.length);
            executeAbleList.push(value);
            return true;
        } else {
            return false;
        }
    }

    public optimizeByStart(
        value: BlueprintRuntimeBaseNode,
        executeAbleList: BlueprintRuntimeBaseNode[],
    ) {
        let stack = [value];
        while (stack.length > 0) {
            const node = stack.pop();
            if (this._addNode(node, executeAbleList) && node.outExecutes) {
                node.optimize();
                node.outExecutes.forEach((item) => {
                    if (item.linkTo && item.linkTo[0]) {
                        stack.push(item.linkTo[0].owner);
                    }
                });
            }
        }
    }

    public clear() {
        this.executeList.length = 0;
    }

    public optimize() {}

    public onParse(bpjson: BlueprintJsonItem[]) {}

    public append(node: BlueprintNode, _item: BlueprintGraphItemJson) {
        this.nodeMap.set(node.nid, node);
    }

    public getRunID() {
        if (this.poolIds.length > 0) {
            return this.poolIds.pop();
        } else {
            return ++this._maxID;
        }
    }

    public _recoverRunID(id: number, runtimeDataMgr: RuntimeDataManager) {
        this.poolIds.push(id);
        runtimeDataMgr.clearVar(id);
    }

    public recoverRunID(id: number, runtimeDataMgr: RuntimeDataManager) {
        if (this.hasRefAnony) {
            this.poolIds.push(id);
            runtimeDataMgr.clearVar(id);
        }
    }

    public runAnonymous(
        context: BlueprintExecuteNode,
        event: BlueprintNode,
        parms: unknown[] | null,
        cb: (() => void) | null,
        runId: number,
        execId: number,
        newRunId: number,
        oldRuntimeDataMgr: RuntimeDataManager,
    ) {
        let anonymousBlock = this.anonymousBlockMap.get(String(event.nid));
        if (anonymousBlock.haRef) oldRuntimeDataMgr.saveContextData(runId, newRunId);
        return anonymousBlock.run(
            context,
            event as BlueprintEventNode,
            parms,
            cb,
            newRunId,
            execId,
        );
    }

    public runByContext(
        context: BlueprintExecuteNode,
        runtimeDataMgr: RuntimeDataManager,
        node: BlueprintRuntimeBaseNode | BlueprintPromise,
        enableDebugPause: boolean,
        cb: (() => void) | null,
        runId: number,
        fromPin: BlueprintPinRuntime | null,
        prePin: BlueprintPinRuntime | null,
        notRecover = false,
    ) {
        if (runId == -1) {
            runId = this.getRunID();
        }
        let idToIndex = this.idToIndex;
        const currentIndex = idToIndex.get(node.nid);
        const executeAbleList = this.executeList;
        let brecover = true;
        for (let i = currentIndex, n = executeAbleList.length; i < n; ) {
            const bpNode = executeAbleList[i];
            let index = bpNode.step(
                context,
                runtimeDataMgr,
                true,
                this,
                enableDebugPause,
                runId,
                fromPin,
                prePin,
            );
            enableDebugPause = true;
            if (index instanceof BlueprintPinRuntime) {
                prePin = index;
                fromPin = index.linkTo[0];
                if (fromPin == null) {
                    break;
                } else {
                    i = idToIndex.get(fromPin.owner.nid);
                }
            } else if (index instanceof BlueprintPromise) {
                index.wait((mis) => {
                    this.runByContext(
                        context,
                        runtimeDataMgr,
                        mis,
                        mis.enableDebugPause != undefined ? mis.enableDebugPause : enableDebugPause,
                        cb,
                        runId,
                        mis.pin,
                        mis.prePin,
                    );
                });
                return false;
            } else if (index == null) {
                break;
            } else {
                brecover = false;
                break;
            }
        }
        cb && cb();
        if (!notRecover && brecover) {
            this.recoverRunID(runId, runtimeDataMgr);
            this.finish(context);
        }
        return true;
    }

    public finish(context: BlueprintExecuteNode) {}
}
