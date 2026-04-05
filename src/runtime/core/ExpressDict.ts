// Auto-generated from res/y.blueprint.js

import { ExpressTreeBase } from "./ExpressTreeBase";

export class ExpressDict extends ExpressTreeBase {
    public left!: ExpressTreeBase;
    public right!: ExpressTreeBase;
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
