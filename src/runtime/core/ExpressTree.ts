// Auto-generated from res/y.blueprint.js

import { ExpressFunction } from "./ExpressFunction";
import { ExpressOrgin } from "./ExpressOrgin";
import { ExpressParse } from "./ExpressParse";
import { ExpressProperty } from "./ExpressProperty";
import { ExpressString } from "./ExpressString";
import { Precedence } from "./BlueprintDefs";

export class ExpressTree {
    public _inited: boolean | undefined;
    public left: ExpressTree | null;
    public operatorPriority: unknown;
    public realMap: unknown;
    public right: ExpressTree | null;
    public value: string;
    public static strReg: RegExp = new RegExp("^(\"|')(.*)\\1$");
    public static realMap: Record<string, unknown> = {
        true: true,
        false: false,
        null: null,
        undefined: undefined,
    };
    public static operatorPriority: Record<string, ExpressTree> = {};
    public static _inited: boolean | undefined = false;
    public call(context: unknown): unknown {
        return null;
    }

    constructor(value: string) {
        this.value = value;
        this.left = null;
        this.right = null;
    }

    public static autoFormat(value: string): unknown {
        let str;
        if (ExpressTree.realMap.hasOwnProperty(value)) {
            return ExpressTree.realMap[value];
        } else if (ExpressTree.isNumber(value)) {
            return parseFloat(value);
        } else if ((str = ExpressTree.isString(value))) {
            return str;
        } else {
            try {
                return JSON.parse(value);
            } catch (e) {
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
        let result = ExpressTree.strReg.exec(token);
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
        let node = new ExpressTree(this.value);
        if (this.left) {
            node.left = this.left.clone();
        }
        if (this.right) {
            node.right = this.right.clone();
        }
        node.call = this.call;
        return node;
    }

    public static parseProperty(express: string): ExpressProperty {
        let op;
        const parts = ExpressTree.splitExpress(express);
        let operators = [];
        let isFun;
        let params = [];
        for (const part of parts) {
            if (part.includes("(")) {
                let ind = part.indexOf("(");
                let funName = part.slice(0, ind);
                let funPara = part.slice(ind + 1, part.length - 1);
                let tparams = funPara.split(",");
                for (let i = 0; i < tparams.length; i++) {
                    let param = tparams[i];
                    if (!ExpressTree.isNumber(param)) {
                        let str = ExpressTree.isString(param);
                        if (str === false) {
                            if (this.realMap.hasOwnProperty(param)) {
                                params[i] = new ExpressOrgin(
                                    this.realMap[param] as string | number,
                                );
                            } else if (this.isExpress(param)) {
                                params[i] = ExpressParse.instance.parse(param);
                            } else {
                                params[i] = this.parseProperty(param);
                            }
                        } else {
                            params[i] = new ExpressString(str);
                        }
                    } else {
                        params[i] = new ExpressOrgin(Number(param));
                    }
                }
                operators.push(funName);
                isFun = true;
            } else {
                operators.push(part);
            }
        }
        if (isFun) {
            op = new ExpressFunction(operators);
            op.params = params;
        } else {
            op = new ExpressProperty(operators);
        }
        return op;
    }

    public static creatreExpressTree(express: string): ExpressTree {
        let op = this.operatorPriority[express];
        if (op == null) {
            if (this.isNumber(express)) {
                op = new ExpressOrgin(Number(express));
            } else {
                let str = this.isString(express);
                if (str === false) {
                    if (this.realMap.hasOwnProperty(express)) {
                        op = new ExpressOrgin(this.realMap[express] as string | number);
                    } else {
                        op = this.parseProperty(express);
                    }
                } else {
                    op = new ExpressString(str);
                }
            }
            return op;
        }
        return op.clone();
    }

    public static init() {
        if (!this._inited) {
            const allPrioritys = [];
            for (let key in Precedence) {
                let treeNode = new ExpressTree(key);
                allPrioritys.push(treeNode);
                switch (key) {
                    case "=":
                        treeNode.call = function (context) {
                            return this.left.equal(this.right.call(context), context);
                        };
                        break;
                    case "+=":
                        treeNode.call = function (context) {
                            return this.left.equal(
                                (this.left.call(context) as any) +
                                    (this.right.call(context) as any),
                                context,
                            );
                        };
                        break;
                    case "&":
                        treeNode.call = function (context) {
                            return (
                                (this.left.call(context) as any) & (this.right.call(context) as any)
                            );
                        };
                        break;
                    case "|":
                        treeNode.call = function (context) {
                            return (
                                (this.left.call(context) as any) | (this.right.call(context) as any)
                            );
                        };
                        break;
                    case "&&":
                        treeNode.call = function (context) {
                            return (
                                (this.left.call(context) as any) &&
                                (this.right.call(context) as any)
                            );
                        };
                        break;
                    case "||":
                        treeNode.call = function (context) {
                            return (
                                (this.left.call(context) as any) ||
                                (this.right.call(context) as any)
                            );
                        };
                        break;
                    case "+":
                        treeNode.call = function (context) {
                            return (
                                (this.left.call(context) as any) + (this.right.call(context) as any)
                            );
                        };
                        break;
                    case "-":
                        treeNode.call = function (context) {
                            return (
                                (this.left.call(context) as any) - (this.right.call(context) as any)
                            );
                        };
                        break;
                    case "*":
                        treeNode.call = function (context) {
                            return (
                                (this.left.call(context) as any) * (this.right.call(context) as any)
                            );
                        };
                        break;
                    case "/":
                        treeNode.call = function (context) {
                            return (
                                (this.left.call(context) as any) / (this.right.call(context) as any)
                            );
                        };
                        break;
                    case ">=":
                        treeNode.call = function (context) {
                            return (
                                (this.left.call(context) as any) >=
                                (this.right.call(context) as any)
                            );
                        };
                        break;
                    case "<=":
                        treeNode.call = function (context) {
                            return (
                                (this.left.call(context) as any) <=
                                (this.right.call(context) as any)
                            );
                        };
                        break;
                    case "==":
                        treeNode.call = function (context) {
                            return this.left.call(context) == this.right.call(context);
                        };
                        break;
                    case "!=":
                        treeNode.call = function (context) {
                            return this.left.call(context) != this.right.call(context);
                        };
                        break;
                    case ">":
                        treeNode.call = function (context) {
                            return (
                                (this.left.call(context) as any) > (this.right.call(context) as any)
                            );
                        };
                        break;
                    case "<":
                        treeNode.call = function (context) {
                            return (
                                (this.left.call(context) as any) < (this.right.call(context) as any)
                            );
                        };
                        break;
                    case "!":
                        treeNode.call = function (context) {
                            return !(this.right.call(context) as any);
                        };
                        break;
                    case "++":
                        treeNode.call = function (context) {
                            if (this.right) {
                                return this.right.equal(
                                    (this.right.call(context) as any) + 1,
                                    context,
                                );
                            } else {
                                let result = this.left.call(context) as any;
                                this.left.equal(result + 1, context);
                                return result;
                            }
                        };
                        break;
                    case "--":
                        treeNode.call = function (context) {
                            if (this.right) {
                                return this.right.equal(
                                    (this.right.call(context) as any) - 1,
                                    context,
                                );
                            } else {
                                let result = this.left.call(context) as any;
                                this.left.equal(result - 1, context);
                                return result;
                            }
                        };
                        break;
                }
                allPrioritys.forEach((item, index) => {
                    this.operatorPriority[item.value] = item;
                });
            }
            this._inited = true;
        }
    }
}
