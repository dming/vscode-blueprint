// Auto-generated from res/y.blueprint.js

import { BlueprintUtil } from "./BlueprintUtil";
import { BPType } from "./BlueprintDefs";
import { ClassUtil } from "./ClassUtil";

/** Metadata accumulated while scanning @bp decorators (class / props / funcs). */
export interface BpDecoratorDeclaration {
    name?: string;
    type?: string;
    extends?: unknown;
    canInherited?: unknown;
    construct?: unknown;
    events?: unknown;
    props?: Array<Record<string, unknown>>;
    funcs?: Array<Record<string, unknown>>;
    [key: string]: unknown;
}

export interface BpDecoratorOptions {
    propertyType?: "class" | "property" | "function";
    name?: string;
    type?: string;
    caption?: string;
    catalog?: string;
    tips?: string;
    extends?: unknown;
    canInherited?: unknown;
    construct?: unknown;
    events?: unknown;
    returnType?: unknown;
    params?: unknown;
    modifiers?: {
        isStatic?: boolean;
    } & Record<string, unknown>;
    [key: string]: unknown;
}

export class BlueprintDecorator {
    public static bpUserMap: Map<object, BpDecoratorDeclaration> = new Map();
    public static initDeclaration(name: string, cls: object): BpDecoratorDeclaration {
        let type = "Others";
        const nodeCtor = ClassUtil.getNodeCtor?.() ?? null;
        const componentCtor = ClassUtil.getComponentCtor?.() ?? null;
        if (nodeCtor && cls instanceof nodeCtor) {
            type = "Node";
        } else if (componentCtor && cls instanceof componentCtor) {
            type = "Component";
        }
        let declare = {
            name,
            type,
        };
        BlueprintDecorator.bpUserMap.set(cls, declare);
        return declare;
    }

    public static bpClass(
        target: { prototype: object },
        options: BpDecoratorOptions,
    ): BpDecoratorDeclaration | null {
        if (options.propertyType && options.propertyType != "class") {
            console.error("BP:Reg class Fail :", options.name, " , propertType is not class!");
            return null;
        }
        let propertType = target.prototype;
        let declare = BlueprintDecorator.bpUserMap.get(propertType);
        if (!declare) {
            declare = BlueprintDecorator.initDeclaration(options.name, propertType);
        } else {
            declare.name = options.name;
        }
        if (options.extends) {
            declare.extends = options.extends;
        }
        if (options.canInherited) {
            declare.canInherited = options.canInherited;
        }
        if (options.construct) {
            declare.construct = options.construct;
        }
        if (options.events) {
            declare.events = options.events;
        }
        BlueprintDecorator.bpUserMap.delete(propertType);
        return declare;
    }

    public static bpProperty(
        target: { prototype: object },
        propertyKey: string,
        options: BpDecoratorOptions,
    ) {
        if (options.propertyType && options.propertyType != "property") {
            console.error("BP:Reg Property Fail :", propertyKey, " , propertType is not property!");
            return;
        }
        let isStatic = options.modifiers ? !!options.modifiers.isStatic : false;
        let mapkey = isStatic ? target.prototype : target;
        let declare = BlueprintDecorator.bpUserMap.get(mapkey);
        if (!declare) {
            declare = BlueprintDecorator.initDeclaration("", mapkey);
        }
        let prop = {
            name: propertyKey,
            type: options.type,
            caption: options.caption,
            catalog: options.catalog,
            modifiers: options.modifiers,
            tips: options.tips,
        };
        if (!prop.modifiers) {
            prop.modifiers = {};
            prop.modifiers.isPublic = true;
        }
        if (!declare.props) {
            declare.props = [];
        }
        declare.props.push(prop);
    }

    public static bpFunction(
        target: { prototype: object },
        propertyKey: string,
        descriptor: PropertyDescriptor,
        options: BpDecoratorOptions,
    ) {
        let _a, _b;
        if (options.propertyType && options.propertyType != "function") {
            console.error("BP:Reg Function Fail :", propertyKey, " , propertType is not function!");
            return;
        }
        let isStatic = options.modifiers ? !!options.modifiers.isStatic : false;
        let mapkey = isStatic ? target.prototype : target;
        let declare = BlueprintDecorator.bpUserMap.get(mapkey);
        if (!declare) {
            declare = BlueprintDecorator.initDeclaration("", mapkey);
        }
        let func = {
            name: propertyKey,
            type: options.type || BPType.Function,
            returnType: (_a = options.returnType) !== null && _a !== void 0 ? _a : "void",
            caption: options.caption,
            catalog: options.catalog,
            modifiers: options.modifiers,
            tips: options.tips,
            params: (_b = options.params) !== null && _b !== void 0 ? _b : [],
        };
        if (!func.modifiers) {
            func.modifiers = {};
            func.modifiers.isPublic = true;
        }
        if (!declare.funcs) {
            declare.funcs = [];
        }
        declare.funcs.push(func);
    }

    public static bpAccessor(
        target: { prototype: object },
        propertyKey: string,
        descriptor: PropertyDescriptor,
        options: BpDecoratorOptions,
    ) {
        if (options.propertyType && options.propertyType != "property") {
            console.error("BP:Reg Accessor Fail :", propertyKey, " , propertType is not property!");
            return;
        }
        let isStatic = options.modifiers ? !!options.modifiers.isStatic : false;
        let mapkey = isStatic ? target.prototype : target;
        let declare = BlueprintDecorator.bpUserMap.get(mapkey);
        if (!declare) {
            declare = BlueprintDecorator.initDeclaration("", mapkey);
        }
        let prop = {
            name: propertyKey,
            type: options.type,
            caption: options.caption,
            catalog: options.catalog,
            modifiers: options.modifiers,
            tips: options.tips,
        };
        if (!prop.modifiers) {
            prop.modifiers = {};
            prop.modifiers.isPublic = true;
        }
        if (descriptor.get && !descriptor.set) {
            prop.modifiers.isReadonly = true;
        }
        if (!declare.props) {
            declare.props = [];
        }
        declare.props.push(prop);
    }

    public static createBPEnum(name: string, members: unknown) {
        let declare = {
            name,
            type: "Enum",
            members,
        };
        BlueprintUtil.addCustomData(name, declare);
    }
}
