// Auto-generated from res/y.blueprint.js
// Split from ExpressTree to break circular imports with ExpressProperty / ExpressParse.

export class ExpressTreeBase {
    public _inited: boolean | undefined;
    public left: ExpressTreeBase | null;
    public operatorPriority: unknown;
    public realMap: unknown;
    public right: ExpressTreeBase | null;
    public value: string;
    public static strReg: RegExp = new RegExp("^(\"|')(.*)\\1$");
    public static realMap: Record<string, unknown> = {
        true: true,
        false: false,
        null: null,
        undefined: undefined,
    };
    public static operatorPriority: Record<string, ExpressTreeBase> = {};
    public static _inited: boolean | undefined = false;
    public call(_context: unknown): unknown {
        return null;
    }

    constructor(value: string) {
        this.value = value;
        this.left = null;
        this.right = null;
    }

    public static autoFormat(value: string): unknown {
        let str;
        if (ExpressTreeBase.realMap.hasOwnProperty(value)) {
            return ExpressTreeBase.realMap[value];
        } else if (ExpressTreeBase.isNumber(value)) {
            return parseFloat(value);
        } else if ((str = ExpressTreeBase.isString(value))) {
            return str;
        } else {
            try {
                return JSON.parse(value);
            } catch (_e) {
                return value;
            }
        }
    }

    public equal(_value: unknown, _context: unknown) {
        debugger;
    }

    public static isNumber(token: string | number) {
        const n = +token;
        return !isNaN(n) && isFinite(n);
    }

    public static isString(token: string): string | false {
        const result = ExpressTreeBase.strReg.exec(token);
        if (result) {
            return result[2];
        }
        return false;
    }

    public static isExpress(token: string) {
        const regex = /[&|.!+\-*/]/;
        return regex.test(token);
    }

    public static splitExpress(express: string): string[] {
        const parts = [];
        let currentPart = "";
        let parenthesesDepth = 0;
        for (const char of express) {
            if (char === "(") {
                parenthesesDepth++;
                currentPart += char;
            } else if (char === ")") {
                parenthesesDepth--;
                currentPart += char;
            } else if (char === "." && parenthesesDepth === 0) {
                parts.push(currentPart);
                currentPart = "";
            } else {
                currentPart += char;
            }
        }
        if (currentPart) {
            parts.push(currentPart);
        }
        return parts;
    }

    public clone() {
        const node = new ExpressTreeBase(this.value);
        if (this.left) {
            node.left = this.left.clone();
        }
        if (this.right) {
            node.right = this.right.clone();
        }
        node.call = this.call;
        return node;
    }

    /** Assigned in `expressTreeOps.ts` after subclass registration. */
    public static parseProperty = undefined as unknown as (express: string) => ExpressTreeBase;
    public static creatreExpressTree = undefined as unknown as (express: string) => ExpressTreeBase;
    public static init = undefined as unknown as (this: typeof ExpressTreeBase) => void;
}
