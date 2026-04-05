// Auto-generated from res/y.blueprint.js

import { ExpressProperty } from "./ExpressProperty";
import type { ExpressTreeBase } from "./ExpressTreeBase";
import { registerExpressFunction } from "./expressCycleBreaker";

export class ExpressFunction extends ExpressProperty {
    public params: ExpressTreeBase[];

    constructor(operators: string[]) {
        super(operators);
        this.params = [];
    }
}

registerExpressFunction(ExpressFunction);
