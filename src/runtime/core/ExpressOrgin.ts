// Auto-generated from res/y.blueprint.js

import { ExpressTree } from "./ExpressTree";

export class ExpressOrgin extends ExpressTree {
    /** Literal evaluated by `call` (number, string, or mapped constant). */
    private _literal: string | number;
    constructor(value: string | number) {
        super(String(value));
        this._literal = value;
    }

    public call(context: unknown): unknown {
        return this._literal;
    }
}
