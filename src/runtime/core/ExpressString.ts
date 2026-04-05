// Auto-generated from res/y.blueprint.js

import { ExpressTree } from "./ExpressTree";

export class ExpressString extends ExpressTree {
    public value: string;
    constructor(value: string) {
        super(value);
    }

    public call(_context: unknown): string {
        return this.value;
    }
}
