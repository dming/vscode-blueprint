// Auto-generated from res/y.blueprint.js

import { BPType } from "./BlueprintDefs";
import type { BlueprintBuiltinEntry } from "./BlueprintDataTypes";

export const BlueprintDataList: ReadonlyArray<BlueprintBuiltinEntry> = [
    {
        name: "static_get",
        menuPath: "none",
        type: BPType.GetValue,
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "target",
                type: "class",
            },
        ],
        output: [
            {
                type: "any",
            },
        ],
    },
    {
        name: "get_self",
        caption: "GetSelf",
        bpType: "prop",
        type: BPType.GetValue,
        isSelf: true,
        modifiers: {
            isStatic: true,
            isReadonly: true,
        },
        properties: [],
        output: [
            {
                name: "self",
                type: "any",
            },
        ],
    },
    {
        id: "_$bpOnSet",
        name: "onPropertyChanged_EM",
        type: "event",
        bpType: "function",
        menuPath: "none",
        modifiers: {
            isPublic: true,
        },
        properties: [],
        output: [
            {
                name: "then",
                type: "exec",
            },
        ],
    },
    {
        name: "static_set",
        menuPath: "none",
        type: BPType.SetValue,
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "execute",
                type: "exec",
            },
            {
                name: "target",
                type: "class",
            },
            {
                name: "set",
                type: "any",
            },
        ],
        output: [
            {
                name: "then",
                type: "exec",
            },
            {
                name: "return",
                type: "any",
            },
        ],
    },
    {
        name: "tmp_get",
        menuPath: "none",
        type: BPType.GetTmpValue,
        properties: [],
        output: [
            {
                type: "any",
            },
        ],
    },
    {
        name: "get",
        menuPath: "none",
        type: BPType.GetValue,
        properties: [
            {
                name: "target",
                type: "any",
            },
        ],
        output: [
            {
                type: "any",
            },
        ],
    },
    {
        name: "set",
        menuPath: "none",
        type: BPType.SetValue,
        properties: [
            {
                name: "execute",
                type: "exec",
            },
            {
                name: "target",
                type: "any",
            },
            {
                name: "set",
                type: "any",
            },
        ],
        output: [
            {
                name: "then",
                type: "exec",
            },
            {
                name: "return",
                type: "any",
            },
        ],
    },
    {
        name: "tmp_set",
        menuPath: "none",
        type: BPType.SetTmpValue,
        properties: [
            {
                name: "execute",
                type: "exec",
            },
            {
                name: "set",
                type: "any",
            },
        ],
        output: [
            {
                name: "then",
                type: "exec",
            },
            {
                name: "return",
                type: "any",
            },
        ],
    },
    {
        name: "branch",
        type: BPType.Branch,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "execute",
                type: "exec",
            },
            {
                name: "condition",
                type: "boolean",
            },
        ],
        output: [
            {
                name: "true",
                type: "exec",
            },
            {
                name: "false",
                type: "exec",
            },
        ],
    },
    {
        name: "sequence",
        type: BPType.Sequence,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "execute",
                type: "exec",
            },
        ],
        output: [
            {
                name: "then0",
                type: "exec",
            },
            {
                name: "then1",
                type: "exec",
            },
            {
                name: "then2",
                type: "exec",
            },
            {
                name: "then3",
                type: "exec",
            },
            {
                name: "then4",
                type: "exec",
            },
        ],
    },
    {
        name: "event_event",
        menuPath: "none",
        type: BPType.Event,
        properties: [],
        output: [
            {
                name: "",
                type: "bpFun",
            },
            {
                name: "then",
                type: "exec",
            },
        ],
    },
    {
        name: "event_on",
        menuPath: "none",
        type: BPType.Function,
        properties: [
            {
                name: "",
                type: "bpFun",
            },
        ],
    },
    {
        name: "event_off",
        menuPath: "none",
        type: BPType.Function,
        properties: [
            {
                name: "",
                type: "bpFun",
            },
        ],
    },
    {
        name: "event_offAll",
        menuPath: "none",
        type: BPType.Function,
        properties: [],
    },
    {
        name: "event_call",
        menuPath: "none",
        type: BPType.Function,
        properties: [],
    },
    {
        name: "custom_fun_start",
        menuPath: "none",
        type: BPType.CustomFunStart,
        properties: [],
        output: [
            {
                name: "then",
                type: "exec",
            },
        ],
    },
    {
        name: "custom_fun_return",
        menuPath: "none",
        type: BPType.CustomFunReturn,
        properties: [
            {
                name: "execute",
                type: "exec",
            },
        ],
    },
    {
        name: "custom_static_fun",
        menuPath: "none",
        type: BPType.CustomFun,
        properties: [
            {
                name: "execute",
                type: "exec",
            },
        ],
        output: [
            {
                name: "then",
                type: "exec",
            },
        ],
    },
    {
        name: "custom_fun",
        menuPath: "none",
        type: BPType.CustomFun,
        properties: [
            {
                name: "execute",
                type: "exec",
            },
            {
                name: "target",
                type: "object",
            },
        ],
        output: [
            {
                name: "then",
                type: "exec",
            },
        ],
    },
    {
        name: "expression",
        menuPath: "system",
        type: BPType.Pure,
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "caller",
                type: "any",
            },
            {
                name: "str",
                type: "string",
            },
        ],
        output: [
            {
                type: "any",
            },
        ],
    },
    {
        name: "as",
        menuPath: "system",
        type: BPType.Assertion,
        modifiers: {
            isStatic: true,
        },
        typeParameters: {
            T: {},
        },
        properties: [
            {
                name: "target",
                type: "any",
            },
            {
                name: "type",
                type: "new()=>T",
            },
        ],
        output: [
            {
                name: "then",
                type: "T",
            },
        ],
    },
    {
        name: "instanceof",
        menuPath: "system",
        type: BPType.Branch,
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "execute",
                type: "exec",
            },
            {
                name: "target",
                type: "any",
            },
            {
                name: "type",
                type: "new()=>T",
            },
        ],
        output: [
            {
                name: "true",
                type: "exec",
            },
            {
                name: "false",
                type: "exec",
            },
        ],
    },
    {
        name: "equal",
        type: BPType.Pure,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "a",
                type: "any",
            },
            {
                name: "b",
                type: "any",
            },
        ],
        output: [
            {
                name: "result",
                type: "boolean",
            },
        ],
    },
    {
        name: "and",
        type: BPType.Pure,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "a",
                type: "any",
            },
            {
                name: "b",
                type: "any",
            },
        ],
        output: [
            {
                name: "result",
                type: "boolean",
            },
        ],
    },
    {
        name: "or",
        type: BPType.Pure,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "a",
                type: "any",
            },
            {
                name: "b",
                type: "any",
            },
        ],
        output: [
            {
                name: "result",
                type: "boolean",
            },
        ],
    },
    {
        name: "not",
        type: BPType.Pure,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "a",
                type: "any",
            },
        ],
        output: [
            {
                name: "result",
                type: "boolean",
            },
        ],
    },
    {
        name: "isUndefined",
        type: BPType.Pure,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "obj",
                type: "any",
            },
        ],
        output: [
            {
                name: "result",
                type: "boolean",
            },
        ],
    },
    {
        name: "isNull",
        type: BPType.Pure,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "obj",
                type: "any",
            },
        ],
        output: [
            {
                name: "result",
                type: "boolean",
            },
        ],
    },
    {
        name: "toString",
        type: BPType.Pure,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "obj",
                type: "any",
            },
        ],
        output: [
            {
                name: "result",
                type: "string",
            },
        ],
    },
    {
        name: "toNumber",
        type: BPType.Pure,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "obj",
                type: "any",
            },
        ],
        output: [
            {
                name: "result",
                type: "number",
            },
        ],
    },
    {
        name: "toBoolean",
        type: BPType.Pure,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "obj",
                type: "any",
            },
        ],
        output: [
            {
                name: "result",
                type: "boolean",
            },
        ],
    },
    {
        name: "forEach",
        type: BPType.Block,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "execute",
                type: "exec",
            },
            {
                name: "array",
                type: "array",
            },
        ],
        output: [
            {
                name: "loopBody",
                type: "exec",
            },
            {
                name: "element",
                type: "any",
            },
            {
                name: "index",
                type: "number",
            },
            {
                name: "completed",
                type: "exec",
            },
        ],
    },
    {
        name: "forEachWithBreak",
        type: BPType.Block,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "execute",
                type: "exec",
            },
            {
                name: "array",
                type: "array",
            },
            {
                name: "break",
                type: "exec",
            },
        ],
        output: [
            {
                name: "loopBody",
                type: "exec",
            },
            {
                name: "element",
                type: "any",
            },
            {
                name: "index",
                type: "number",
            },
            {
                name: "completed",
                type: "exec",
            },
        ],
    },
    {
        name: "forLoop",
        type: BPType.Block,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "execute",
                type: "exec",
            },
            {
                name: "firstIndex",
                type: "number",
            },
            {
                name: "lastIndex",
                type: "number",
            },
            {
                name: "step",
                type: "number",
            },
        ],
        output: [
            {
                name: "loopBody",
                type: "exec",
            },
            {
                name: "index",
                type: "number",
            },
            {
                name: "completed",
                type: "exec",
            },
        ],
    },
    {
        name: "forLoopWithBreak",
        type: BPType.Block,
        menuPath: "system",
        modifiers: {
            isStatic: true,
        },
        properties: [
            {
                name: "execute",
                type: "exec",
            },
            {
                name: "firstIndex",
                type: "number",
            },
            {
                name: "lastIndex",
                type: "number",
            },
            {
                name: "step",
                type: "number",
            },
            {
                name: "break",
                type: "exec",
            },
        ],
        output: [
            {
                name: "loopBody",
                type: "exec",
            },
            {
                name: "index",
                type: "number",
            },
            {
                name: "completed",
                type: "exec",
            },
        ],
    },
] satisfies ReadonlyArray<BlueprintBuiltinEntry>;
