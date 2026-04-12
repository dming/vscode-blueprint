import type { BlueprintConfigLifecycleHookJson, BlueprintConfigNodeDefJson } from "../../../src/shared/JsonType/BlueprintConfigType";
import { registerBaseClass, registerNodeDef } from "./registry";

type LifecyclePin = string | { name: string; type: string };

export type LifecycleMethodOptions = {
  /** Pin strings such as `"deltaTime:number"` or `{ name, type }`. */
  outputs?: LifecyclePin[];
};

const lifecycleHooksByCtor = new Map<Function, BlueprintConfigLifecycleHookJson[]>();

function appendLifecycleHook(ctor: Function, hook: BlueprintConfigLifecycleHookJson): void {
  const list = lifecycleHooksByCtor.get(ctor) ?? [];
  list.push(hook);
  lifecycleHooksByCtor.set(ctor, list);
}

/**
 * Marks a lifecycle method on a blueprint **base class** host (editor pins + runtime `inherits`).
 * Use on stub methods; bodies are not executed by the export script.
 */
export function Lifecycle(opts?: LifecycleMethodOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const ctor = target.constructor as Function;
    const name = String(propertyKey);
    const outputs = opts?.outputs?.length
      ? opts.outputs.map((p) => (typeof p === "string" ? p : `${p.name}:${p.type}`))
      : [];
    appendLifecycleHook(ctor, outputs.length ? { name, outputs } : { name, outputs: [] });
  };
}

/**
 * Registers this class under `baseClasses[className]` in `blueprint.config.json`.
 * `className` defaults to the runtime class name (e.g. `Component`).
 */
export function BlueprintBaseClass(className?: string): ClassDecorator {
  return (ctor: Function) => {
    const key = className ?? ctor.name;
    const lifecycle = [...(lifecycleHooksByCtor.get(ctor) ?? [])];
    lifecycleHooksByCtor.delete(ctor);
    registerBaseClass(key, lifecycle);
  };
}

/**
 * Registers a **node template** (`nodeDefs[]`). Attach to a static stub method on a palette class.
 */
export function BlueprintNodeDef(meta: BlueprintConfigNodeDefJson): MethodDecorator {
  return (_target: object, _propertyKey: string | symbol, _descriptor: PropertyDescriptor) => {
    registerNodeDef(meta);
    return _descriptor;
  };
}
