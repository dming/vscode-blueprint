// Auto-generated from res/y.blueprint.js

export class RuntimePinData {
    public name!: string;
    public value: unknown;
    public valueMap: RuntimeValueByRunId;
    constructor() {
        this.valueMap = new Map();
    }

    public copyValue(runId: number, toRunId: number) {
        const value = this.valueMap.get(runId);
        if (value != undefined) {
            this.valueMap.set(toRunId, value);
        }
    }

    public initValue(value: unknown) {
        this.value = value;
        this.getValue = this.getValueOnly;
    }

    public setValue(runId: number, value: unknown) {
        this.valueMap.set(runId, value);
    }

    public getValueOnly(_runId: number) {
        return this.value;
    }

    public getValue(runId: number) {
        return this.valueMap.get(runId);
    }
}

type RuntimeValueByRunId = Map<number, unknown>;
