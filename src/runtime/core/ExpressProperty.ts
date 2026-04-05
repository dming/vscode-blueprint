// Auto-generated from res/y.blueprint.js

import { BlueprintFactory } from "./BlueprintFactory";
import { ExpressTreeBase } from "./ExpressTreeBase";
import { registerExpressProperty } from "./expressCycleBreaker";

export class ExpressProperty extends ExpressTreeBase {
    public propertys: string[];
    public realKey: string | undefined;
    public realObj: unknown;
    constructor(operators: string[]) {
        super(operators[0] ?? "");
        this.propertys = operators;
    }

    public equal(value: unknown, context: unknown) {
        if (this.realObj) {
            (this.realObj as Record<string, unknown>)[this.realKey!] = value;
        } else {
            (context as Record<string, unknown>)[this.propertys[0]] = value;
        }
        return value;
    }

    public call(context: unknown): unknown {
        let result: unknown = context;
        this.propertys.forEach((item) => {
            if (result) {
                this.realObj = result;
                const rec = result as Record<PropertyKey, unknown>;
                const ctx = rec[BlueprintFactory.contextSymbol as unknown as PropertyKey];
                if (ctx && typeof ctx === "object" && "getVar" in ctx) {
                    result = (ctx as { getVar(name: string): unknown }).getVar(item);
                } else {
                    result = rec[item];
                }
                this.realKey = item;
            } else {
                console.warn(this.propertys, item + "属性不存在");
            }
        });
        return result;
    }
}

registerExpressProperty(ExpressProperty);
