// Auto-generated from res/y.blueprint.js

import { ExpressTree } from "./ExpressTree";

export class ExpressDict extends ExpressTree {
    public left!: ExpressTree;
    public right!: ExpressTree;
    public call(context: unknown): unknown {
        const obj = this.left.call(context) as Record<PropertyKey, unknown>;
        const key = this.right.call(context) as PropertyKey;
        return obj[key];
    }

    public equal(value: unknown, context: unknown) {
        const obj = this.left.call(context) as Record<PropertyKey, unknown>;
        const key = this.right.call(context) as PropertyKey;
        obj[key] = value;
    }
}
