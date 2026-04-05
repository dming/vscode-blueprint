// Auto-generated from res/y.blueprint.js

import { ExpressTreeBase } from "./ExpressTreeBase";

export class ExpressOrgin extends ExpressTreeBase {
    /** Literal evaluated by `call` (number, string, or mapped constant). */
    private _literal: string | number;
    constructor(value: string | number) {
        super(String(value));
        this._literal = value;
    }

    public call(_context: unknown): unknown {
        return this._literal;
    }
}
