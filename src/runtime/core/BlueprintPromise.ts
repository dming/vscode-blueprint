// Auto-generated from res/y.blueprint.js

import type { BlueprintPinRuntime } from "./BlueprintPinRuntime";

export class BlueprintPromise {
    private _callback: ((self: BlueprintPromise) => void) | null = null;
    private _completed = false;
    public nid: string | number | null = null;
    public pin: BlueprintPinRuntime | null = null;
    public prePin: BlueprintPinRuntime | null = null;
    /** Carried when a promise resumes `runByContext` (see `BluePrintBlock.runByContext`). */
    public enableDebugPause?: boolean;
    public static create() {
        return new BlueprintPromise();
    }

    public wait(callback: (self: BlueprintPromise) => void) {
        this._callback = callback;
        if (this._completed) {
            callback(this);
        }
    }

    public hasCallBack() {
        return this._callback != null;
    }

    public complete() {
        this._completed = true;
        this._callback && this._callback(this);
    }

    public recover() {
        this.clear();
    }

    public clear() {
        this._callback = null;
        this._completed = false;
        this.pin = null;
        this.nid = null;
        this.prePin = null;
    }
}
