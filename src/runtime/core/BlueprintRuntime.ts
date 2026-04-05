// Auto-generated from res/y.blueprint.js

import { BluePrintFunBlock } from "./BluePrintFunBlock";
import { BluePrintMainBlock } from "./BluePrintMainBlock";
import type { BlueprintExecuteNode } from "./BlueprintExecuteNode";
import type { BlueprintEventNode } from "./node/BlueprintEventNode";
import type {
    BlueprintClassParseRuntime,
    BlueprintNodeConstructor,
} from "./BlueprintFactory";
import type { BlueprintPinRuntime } from "./BlueprintPinRuntime";
import type { BluePrintBlock } from "./BluePrintBlock";
import type { RuntimeDataManager } from "./RuntimeDataManager";
import type { BlueprintVariableMap } from "./RuntimeDataManager";
import type {
    BlueprintDataMap,
    BlueprintFunctionGraphJson,
    BlueprintJsonItem,
    BlueprintParsePayload,
} from "./BlueprintJsonTypes";
import { BlueprintFactory } from "./BlueprintFactory";

export class BlueprintRuntime implements BlueprintClassParseRuntime {
    public dataMap: BlueprintDataMap | undefined;
    public funBlockMap: Map<string, BluePrintFunBlock>;
    public isRunningInIDE: boolean;
    public mainBlock: BluePrintMainBlock;
    constructor() {
        this.isRunningInIDE = false;
        const mainId = BlueprintFactory.adapters?.mainId ?? 0;
        this.mainBlock = new BluePrintMainBlock(mainId);
        this.funBlockMap = new Map();
    }

    public run(
        context: BlueprintExecuteNode,
        event: BlueprintEventNode,
        parms: unknown[] | null,
        cb: (() => void) | null,
    ) {
        this.mainBlock.run(context, event, parms, cb, this.mainBlock.getRunID(), -1);
    }

    public runCustomFun(
        context: BlueprintExecuteNode,
        funId: string | undefined,
        parms: unknown[] | null,
        cb: (() => void) | null,
        runId: number,
        execId: number,
        outExecutes: BlueprintPinRuntime[],
        runner: BluePrintBlock,
        oldRuntimeDataMgr: RuntimeDataManager,
    ): boolean | null {
        let fun = funId ? this.funBlockMap.get(funId) : undefined;
        if (fun) {
            return fun.run(
                context,
                null,
                parms,
                cb,
                runId,
                execId,
                outExecutes,
                runner,
                oldRuntimeDataMgr,
            );
        }
        return null;
    }

    public parse(
        mainBlockData: BlueprintParsePayload,
        getCNodeByNode: (item: BlueprintJsonItem) => unknown,
        varMap: BlueprintVariableMap | null,
        newCls: BlueprintNodeConstructor,
    ) {
        let bpjson = mainBlockData.arr;
        this.mainBlock.name = mainBlockData.name;
        this.mainBlock.dataMap = this.dataMap;
        this.mainBlock.cls = newCls;
        this.mainBlock.parse(bpjson, getCNodeByNode, {});
    }

    public parseFunction(
        funData: BlueprintFunctionGraphJson,
        getCNodeByNode: (item: BlueprintJsonItem) => unknown,
    ) {
        let _a;
        let funId = String(funData.id),
            bpjson = funData.arr as BlueprintJsonItem[];
        let fun = new BluePrintFunBlock(funId);
        fun.isStatic =
            (_a = funData.modifiers as { isStatic?: boolean } | null | undefined) === null ||
            _a === void 0
                ? void 0
                : _a.isStatic;
        fun.mainBlock = this.mainBlock;
        fun.name = funData.name as string;
        fun.dataMap = this.dataMap;
        let varMap: BlueprintVariableMap = {};
        const variables = funData.variable as Array<{ name: string }> | undefined;
        if (variables) {
            variables.forEach((item) => {
                varMap[item.name] = { name: item.name, value: undefined, ...item };
            });
        }
        fun.parse(bpjson as BlueprintJsonItem[], getCNodeByNode, varMap);
        this.funBlockMap.set(funId, fun);
    }

    public toCode(context: BlueprintExecuteNode) {}
}
