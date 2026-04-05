// Wires static methods onto ExpressTreeBase after subclasses register (breaks ESM cycles).

import { Precedence } from "./BlueprintDefs";
import { ExpressParse } from "./ExpressParse";
import { ExpressOrgin } from "./ExpressOrgin";
import { ExpressString } from "./ExpressString";
import { ExpressTreeBase } from "./ExpressTreeBase";
import { getExprFun, getExprProp } from "./expressCycleBreaker";

ExpressTreeBase.parseProperty = function parseProperty(express: string): ExpressTreeBase {
    let op: ExpressTreeBase;
    const parts = ExpressTreeBase.splitExpress(express);
    const operators: string[] = [];
    let isFun: boolean | undefined;
    const params: ExpressTreeBase[] = [];
    for (const part of parts) {
        if (part.includes("(")) {
            const ind = part.indexOf("(");
            const funName = part.slice(0, ind);
            const funPara = part.slice(ind + 1, part.length - 1);
            const tparams = funPara.split(",");
            for (let i = 0; i < tparams.length; i++) {
                const param = tparams[i];
                if (!ExpressTreeBase.isNumber(param)) {
                    const str = ExpressTreeBase.isString(param);
                    if (str === false) {
                        if (ExpressTreeBase.realMap.hasOwnProperty(param)) {
                            params[i] = new ExpressOrgin(
                                ExpressTreeBase.realMap[param] as string | number,
                            );
                        } else if (ExpressTreeBase.isExpress(param)) {
                            const parsed = ExpressParse.instance.parse(param);
                            if (parsed) {
                                params[i] = parsed;
                            }
                        } else {
                            params[i] = ExpressTreeBase.parseProperty(param);
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
        op = new (getExprFun())(operators) as ExpressTreeBase;
        (op as unknown as { params: ExpressTreeBase[] }).params = params;
    } else {
        op = new (getExprProp())(operators) as ExpressTreeBase;
    }
    return op;
};

ExpressTreeBase.creatreExpressTree = function creatreExpressTree(express: string): ExpressTreeBase {
    let op = ExpressTreeBase.operatorPriority[express];
    if (op == null) {
        if (ExpressTreeBase.isNumber(express)) {
            op = new ExpressOrgin(Number(express));
        } else {
            const str = ExpressTreeBase.isString(express);
            if (str === false) {
                if (ExpressTreeBase.realMap.hasOwnProperty(express)) {
                    op = new ExpressOrgin(ExpressTreeBase.realMap[express] as string | number);
                } else {
                    op = ExpressTreeBase.parseProperty(express);
                }
            } else {
                op = new ExpressString(str);
            }
        }
        return op;
    }
    return op.clone();
};

ExpressTreeBase.init = function init(this: typeof ExpressTreeBase) {
    if (!this._inited) {
        const allPrioritys: ExpressTreeBase[] = [];
        for (const key in Precedence) {
            const treeNode = new ExpressTreeBase(key);
            allPrioritys.push(treeNode);
            switch (key) {
                case "=":
                    treeNode.call = function (context) {
                        return this.left!.equal(this.right!.call(context), context);
                    };
                    break;
                case "+=":
                    treeNode.call = function (context) {
                        return this.left!.equal(
                            (this.left!.call(context) as unknown as number) + (this.right!.call(context) as unknown as number),
                            context,
                        );
                    };
                    break;
                case "&":
                    treeNode.call = function (context) {
                        return (
                            (this.left!.call(context) as unknown as number) & (this.right!.call(context) as unknown as number)
                        );
                    };
                    break;
                case "|":
                    treeNode.call = function (context) {
                        return (
                            (this.left!.call(context) as unknown as number) | (this.right!.call(context) as unknown as number)
                        );
                    };
                    break;
                case "&&":
                    treeNode.call = function (context) {
                        return this.left!.call(context) && this.right!.call(context);
                    };
                    break;
                case "||":
                    treeNode.call = function (context) {
                        return this.left!.call(context) || this.right!.call(context);
                    };
                    break;
                case "+":
                    treeNode.call = function (context) {
                        return (
                            (this.left!.call(context) as unknown as number) + (this.right!.call(context) as unknown as number)
                        );
                    };
                    break;
                case "-":
                    treeNode.call = function (context) {
                        return (
                            (this.left!.call(context) as unknown as number) - (this.right!.call(context) as unknown as number)
                        );
                    };
                    break;
                case "*":
                    treeNode.call = function (context) {
                        return (
                            (this.left!.call(context) as unknown as number) * (this.right!.call(context) as unknown as number)
                        );
                    };
                    break;
                case "/":
                    treeNode.call = function (context) {
                        return (
                            (this.left!.call(context) as unknown as number) / (this.right!.call(context) as unknown as number)
                        );
                    };
                    break;
                case ">=":
                    treeNode.call = function (context) {
                        return (
                            (this.left!.call(context) as unknown as number) >= (this.right!.call(context) as unknown as number)
                        );
                    };
                    break;
                case "<=":
                    treeNode.call = function (context) {
                        return (
                            (this.left!.call(context) as unknown as number) <= (this.right!.call(context) as unknown as number)
                        );
                    };
                    break;
                case "==":
                    treeNode.call = function (context) {
                        return this.left!.call(context) == this.right!.call(context);
                    };
                    break;
                case "!=":
                    treeNode.call = function (context) {
                        return this.left!.call(context) != this.right!.call(context);
                    };
                    break;
                case ">":
                    treeNode.call = function (context) {
                        return (
                            (this.left!.call(context) as unknown as number) > (this.right!.call(context) as unknown as number)
                        );
                    };
                    break;
                case "<":
                    treeNode.call = function (context) {
                        return (
                            (this.left!.call(context) as unknown as number) < (this.right!.call(context) as unknown as number)
                        );
                    };
                    break;
                case "!":
                    treeNode.call = function (context) {
                        return !this.right!.call(context);
                    };
                    break;
                case "++":
                    treeNode.call = function (context) {
                        if (this.right) {
                            return this.right.equal(
                                (this.right.call(context) as unknown as number) + 1,
                                context,
                            );
                        } else {
                            const result = this.left!.call(context) as unknown as number;
                            this.left!.equal(result + 1, context);
                            return result;
                        }
                    };
                    break;
                case "--":
                    treeNode.call = function (context) {
                        if (this.right) {
                            return this.right.equal(
                                (this.right.call(context) as unknown as number) - 1,
                                context,
                            );
                        } else {
                            const result = this.left!.call(context) as unknown as number;
                            this.left!.equal(result - 1, context);
                            return result;
                        }
                    };
                    break;
            }
            allPrioritys.forEach((item) => {
                this.operatorPriority[item.value] = item;
            });
        }
        this._inited = true;
    }
};
