// Auto-generated from res/y.blueprint.js

import { ExpressDict } from "./ExpressDict";
import { ExpressTreeBase } from "./ExpressTreeBase";
import { Precedence } from "./BlueprintDefs";

export class ExpressParse {
    private _catch: Map<string, ExpressTreeBase>;
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
            ExpressTreeBase.init();
            this._instance = new ExpressParse();
        }
        return this._instance;
    }

    public isOperator(token: string) {
        return Object.keys(Precedence).indexOf(token) != -1;
    }

    public tokenize(expression: string): string[] | null {
        const exp = new RegExp(
            "/\\*([\\s\\S]*?)\\*/|//.*|'(.*?)'|\"(.*?)\"|\\`([\\s\\S]*?)\\`|\\.{3}|[$\\w.]+|(\\+\\+|--|\\|\\||&&|>>>|>>|<<|==|!=)(=){0,1}|=>|\\*\\*(=){0,1}|[+*-/%=><!\\|&~^](=){0,1}|[?;:()\\[\\]\{\\}]",
            "g",
        );
        const tokens = expression.match(exp);
        if (!tokens) {
            return null;
        }
        const result1 = [];
        let flag = 0;
        const isSingle = (str: string) => {
            return !isNaN(+str) || this.isOperator(str) || ExpressParse.brackets.indexOf(str) != -1;
        };
        for (let i = 0; i < tokens.length; i++) {
            const str1 = tokens[i];
            const str2 = tokens[i + 1];
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
        const result2 = [];
        for (let i = 0; i < result1.length; i++) {
            const str1 = result1[i];
            const str2 = result1[i + 1];
            result2.push(str1);
            if (str2 && !isSingle(str1) && !isSingle(str2)) {
                i++;
                result2[result2.length - 1] += str2;
            }
        }
        return result2;
    }

    public parse(expression: string): ExpressTreeBase | undefined {
        if (this._catch.has(expression)) {
            return this._catch.get(expression);
        }
        const tokens = this.tokenize(expression);
        const operationsStack: string[] = [];
        const valuesStack: (ExpressTreeBase | null)[] = [];
        const applyOperator = () => {
            const operator = operationsStack.pop();
            if (operator === undefined) {
                return;
            }
            const right = valuesStack.pop() ?? null;
            const left = valuesStack.pop() ?? null;
            const node = ExpressTreeBase.creatreExpressTree(operator);
            node.left = left;
            node.right = right;
            valuesStack.push(node);
        };
        if (tokens) {
            tokens.forEach((token) => {
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
                          const r = valuesStack.pop();
                          const l = valuesStack.pop();
                          node.right = r!;
                          node.left = l!;
                          valuesStack.push(node);
                      }
                      operationsStack.pop();
                  } else if (!this.isOperator(token)) {
                      valuesStack.push(ExpressTreeBase.creatreExpressTree(token));
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
        }
        while (operationsStack.length) {
            applyOperator();
        }
        const result = valuesStack.pop();
        if (result !== undefined && result !== null) {
            this._catch.set(expression, result);
        }
        return result === null ? undefined : result;
    }
}
