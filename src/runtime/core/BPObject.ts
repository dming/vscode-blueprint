// Auto-generated from res/y.blueprint.js

export class BPObject {
    public static get(obj: Record<string, unknown>, key: string): unknown {
        return obj[key];
    }

    public static set(obj: Record<string, unknown>, key: string, value: unknown): void {
        obj[key] = value;
    }

    public static has(obj: Record<string, unknown>, key: string): boolean {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }
}
