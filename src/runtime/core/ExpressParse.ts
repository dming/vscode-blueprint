// Auto-generated from res/y.blueprint.js

import { ExpressDict } from "./ExpressDict";
import { ExpressTree } from "./ExpressTree";
import { Precedence } from "./BlueprintDefs";

export class ExpressParse {
    private _catch: Map<string, ExpressTree>;
    public static brackets: string[] = ["(", ")", "[", "]"];
    public static brackmap: Record<string, string> = {
        ")": "(",
        "]": "[",
    };
    private static _instance: ExpressParse | undefined;
    constructor() {
        this._catch = new Map();
    }

    public static get instance() {
        if (!this._instance) {
            ExpressTree.init();
            this._instance = new ExpressParse();
        }
        return this._instance;
    }

    public isOperator(token: string) {
        return Object.keys(Precedence).indexOf(token) != -1;
    }

    public tokenize(expression: string): string[] | null {
        let exp = new RegExp(
            "/\\*([\\s\\S]*?)\\*/|//.*|'(.*?)'|\"(.*?)\"|\\`([\\s\\S]*?)\\`|\\.{3}|[$\\w.]+|(\\+\\+|--|\\|\\||&&|>>>|>>|<<|==|!=)(=){0,1}|=>|\\*\\*(=){0,1}|[+*-/%=><!\\|&~^](=){0,1}|[?;:()\\[\\]\{\\}]",
            "g",
        );
        let tokens = expression.match(exp);
        if (!tokens) {
            return null;
        }
        let result1 = [];
        let flag = 0;
        let isSingle = (str: string) => {
            return !isNaN(+str) || this.isOperator(str) || ExpressParse.brackets.indexOf(str) != -1;
        };
        for (let i = 0; i < tokens.length; i++) {
            let str1 = tokens[i];
            let str2 = tokens[i + 1];
            if (flag) {
                result1[result1.length - 1] += str1;
                if (str2) {
                    if (str2 == ")") {
                        flag--;
                        if (!flag) {
                            result1[result1.length - 1] += str2;
                            i++;
                        }
                    } else if (str2 == "(") {
                        flag++;
                    }
                }
            } else {
                result1.push(str1);
                flag = !isSingle(str1) && str2 == "(" ? 1 : 0;
            }
        }
        let result2 = [];
        for (let i = 0; i < result1.length; i++) {
            let str1 = result1[i];
            let str2 = result1[i + 1];
            result2.push(str1);
            if (str2 && !isSingle(str1) && !isSingle(str2)) {
                i++;
                result2[result2.length - 1] += str2;
            }
        }
        return result2;
    }

    public parse(expression: string): ExpressTree | undefined {
        if (this._catch.has(expression)) {
            return this._catch.get(expression);
        }
        const tokens = this.tokenize(expression);
        const operationsStack = [];
        const valuesStack = [];
        const applyOperator = () => {
            const operator = operationsStack.pop();
            const right = valuesStack.pop();
            const left = valuesStack.pop();
            const node = ExpressTree.creatreExpressTree(operator);
            node.left = left;
            node.right = right;
            valuesStack.push(node);
        };
        tokens === null || tokens === void 0
            ? void 0
            : tokens.forEach((token) => {
                  if (token === "(" || token === "[") {
                      operationsStack.push(token);
                  } else if (token === ")" || token === "]") {
                      while (
                          operationsStack[operationsStack.length - 1] !==
                          ExpressParse.brackmap[token]
                      ) {
                          applyOperator();
                      }
                      if (token == "]") {
                          const node = new ExpressDict("");
                          node.right = valuesStack.pop();
                          node.left = valuesStack.pop();
                          valuesStack.push(node);
                      }
                      operationsStack.pop();
                  } else if (!this.isOperator(token)) {
                      valuesStack.push(ExpressTree.creatreExpressTree(token));
                  } else {
                      while (
                          operationsStack.length &&
                          Precedence[token] <=
                              Precedence[operationsStack[operationsStack.length - 1]]
                      ) {
                          applyOperator();
                      }
                      if (token == "++" || token == "--") {
                          valuesStack.push(null);
                      }
                      operationsStack.push(token);
                  }
              });
        while (operationsStack.length) {
            applyOperator();
        }
        let result = valuesStack.pop();
        this._catch.set(expression, result);
        return result;
    }
}
