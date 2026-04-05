// Auto-generated from res/y.blueprint.js

import { ExpressProperty } from "./ExpressProperty";
import type { ExpressTree } from "./ExpressTree";

export class ExpressFunction extends ExpressProperty {
    public params: ExpressTree[];
    public realObj: unknown;
    public call(context: unknown): unknown {
        let result = super.call(context);
        if (!result || typeof result !== "function") {
            console.warn(this.propertys, "函数不存在");
            return null;
        }
        let tparams = [];
        this.params.forEach((item, index) => {
            tparams.push(item.call(context));
        });
        return (result as (...args: unknown[]) => unknown).apply(this.realObj, tparams);
    }
}
