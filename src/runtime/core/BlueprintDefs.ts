export enum EPinDirection {
    Input = 0,
    Output = 1,
    All = 2,
}

export enum EBlueNodeType {
    Unknow = "unkown",
    Event = "event",
    Fun = "fun",
    Pure = "pure",
    GetVariable = "var",
    SetVarialbe = "setVar",
    Branch = "branch",
    Sequnece = "sequnece",
}

export enum EPinType {
    Exec = 0,
    BPFun = 1,
    Other = 2,
}

export enum BPType {
    Event = "event",
    Function = "function",
    BPEvent = "bpEvent",
    Pure = "pure",
    Class = "class",
    Operator = "operator",
    GetValue = "getvalue",
    SetValue = "setvalue",
    GetTmpValue = "getTmpValue",
    SetTmpValue = "setTmpValue",
    Branch = "branch",
    Block = "Block",
    Sequence = "sequence",
    NewTarget = "newtarget",
    CustomFun = "customFun",
    CustomFunStart = "customFunStart",
    CustomFunReturn = "customFunReturn",
    Expression = "expression",
    Assertion = "Assertion",
}

export enum EBlockSource {
    Unknown = 0,
    Main = 1,
    Function = 2,
}

export const EXECID = "-1";
export const TARGETID = "-2";

export const Precedence: Record<string, number> = {
    "=": 0,
    "+=": 0,
    "|": 0,
    "||": 0,
    "&": 1,
    "&&": 1,
    "+": 2,
    "-": 2,
    "*": 3,
    "/": 3,
    ">=": 4,
    "<=": 4,
    "==": 4,
    "!=": 4,
    ">": 4,
    "<": 4,
    "!": 5,
    "++": 6,
    "--": 6,
};
