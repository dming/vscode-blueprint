export type ClassConstructor<T = object> = new (...args: never[]) => T;

export class ClassUtil {
    /** Optional component ctor accessor. Host can assign. */
    public static getComponentCtor: (() => ClassConstructor | null) | null = null;

    /** Optional node ctor accessor. Host can assign. */
    public static getNodeCtor: (() => ClassConstructor | null) | null = null;

    /**
     * Resolve a class/constructor by name.
     * Host environments (e.g. engines) can override this.
     */
    public static getClassByName(_name: string): ClassConstructor | null {
        return null;
    }

    /**
     * Decode a serialized value into a JS object / instance.
     * Host environments can override this to plug in engine serialization.
     *
     * Returning `null` means "decode not available / failed".
     */
    public static decodeObj(value: unknown, _target?: object): unknown {
        return value;
    }
}
