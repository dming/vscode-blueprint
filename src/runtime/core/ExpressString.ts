// Auto-generated from res/y.blueprint.js

import { ExpressTreeBase } from "./ExpressTreeBase";

export class ExpressString extends ExpressTreeBase {
    public value: string;
    constructor(value: string) {
        super(value);
    }

    public call(_context: unknown): string {
        return this.value;
    }
}
