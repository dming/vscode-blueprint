import { BlueprintFactory } from "../BlueprintFactory";
import { BlueprintStaticFun } from "./BlueprintStaticFun";

/** Host shape for `event_*` builtins registered with `isMember: true`. */
interface BlueprintEventBuiltinHost {
    on(eventName: string, caller: unknown, cb: (...args: unknown[]) => unknown): void;
    off(eventName: string, caller: unknown, cb: (...args: unknown[]) => unknown): void;
    offAll(eventName: string): void;
    event(eventName: string, args: unknown[]): void;
}

export function registerBlueprintFunctions() {
    const rf = BlueprintFactory.regFunction.bind(BlueprintFactory);
    rf("web_consoleLog", function (text: unknown) {
        console.warn("[Blueprint]", text);
    });
    rf("equal", function (a: unknown, b: unknown) {
        return a == b;
    });
    rf("and", function (a: unknown, b: unknown) {
        return !!a && !!b;
    });
    rf("or", function (a: unknown, b: unknown) {
        return !!a || !!b;
    });
    rf("not", function (a: unknown) {
        return !a;
    });
    rf("isUndefined", function (a: unknown) {
        return a === undefined;
    });
    rf("isNull", function (a: unknown) {
        return a == null;
    });
    rf("isNaN", function (a: unknown) {
        return Number.isNaN(Number(a));
    });
    rf("toString", function (a: unknown) {
        return String(a);
    });
    rf("toNumber", function (a: unknown) {
        return Number(a);
    });
    rf("toBoolean", function (a: unknown) {
        return !!a;
    });
    rf("branch", BlueprintStaticFun.branch);
    rf("forEach", BlueprintStaticFun.forEach);
    rf("forEachWithBreak", BlueprintStaticFun.forEachWithBreak);
    rf("forLoop", BlueprintStaticFun.forLoop);
    rf("forLoopWithBreak", BlueprintStaticFun.forLoopWithBreak);
    rf(
        "event_on",
        function (this: BlueprintEventBuiltinHost, eventName: unknown, cb: unknown) {
            this.on(eventName as string, this, cb as (...args: unknown[]) => unknown);
        },
        true
    );
    rf(
        "event_call",
        function (this: BlueprintEventBuiltinHost, eventName: unknown, ...args: unknown[]) {
            this.event(eventName as string, args);
        },
        true
    );
    rf(
        "event_off",
        function (this: BlueprintEventBuiltinHost, eventName: unknown, cb: unknown) {
            this.off(eventName as string, this, cb as (...args: unknown[]) => unknown);
        },
        true
    );
    rf(
        "event_offAll",
        function (this: BlueprintEventBuiltinHost, eventName: unknown, _cb: unknown) {
            this.offAll(eventName as string);
        },
        true
    );
    rf("get", BlueprintStaticFun.getVariable);
    rf("static_get", BlueprintStaticFun.getVariable);
    rf("get_self", BlueprintStaticFun.getSelf);
    rf("set", BlueprintStaticFun.setVariable);
    rf("tmp_get", BlueprintStaticFun.getTempVar);
    rf("tmp_set", BlueprintStaticFun.setTempVar);
    rf("static_set", BlueprintStaticFun.setVariable);
    rf("expression", BlueprintStaticFun.expression);
    rf("instanceof", BlueprintStaticFun.typeInstanceof);
}
