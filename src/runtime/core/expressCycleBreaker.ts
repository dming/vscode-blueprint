/** Breaks ExpressTree ↔ ExpressProperty ↔ ExpressFunction circular ESM init (browser-safe). */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExprCtor = new (...args: any[]) => any;

let _ExpressProperty: ExprCtor | null = null;
let _ExpressFunction: ExprCtor | null = null;

export function registerExpressProperty(C: ExprCtor): void {
    _ExpressProperty = C;
}

export function registerExpressFunction(C: ExprCtor): void {
    _ExpressFunction = C;
}

export function getExprProp(): ExprCtor {
    if (!_ExpressProperty) {
        throw new Error("ExpressProperty not registered (import order)");
    }
    return _ExpressProperty;
}

export function getExprFun(): ExprCtor {
    if (!_ExpressFunction) {
        throw new Error("ExpressFunction not registered (import order)");
    }
    return _ExpressFunction;
}
