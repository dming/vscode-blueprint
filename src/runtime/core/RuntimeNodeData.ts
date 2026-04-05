// Auto-generated from res/y.blueprint.js

export class RuntimeNodeData {
    public callFunMap: RuntimeCallByRunId;
    public map: RuntimeParamsByRunId;
    constructor() {
        this.map = new Map();
        this.callFunMap = new Map();
    }

    public getCallFun(runId: number) {
        return this.callFunMap.get(runId);
    }

    public setCallFun(runId: number, fun: (...args: unknown[]) => unknown) {
        this.callFunMap.set(runId, fun);
    }

    public getParamsArray(runId: number) {
        let result = this.map.get(runId);
        if (!result) {
            result = [];
            this.map.set(runId, result);
        }
        return result;
    }
}

type RuntimeCallByRunId = Map<number, (...args: unknown[]) => unknown>;
type RuntimeParamsByRunId = Map<number, unknown[]>;
