import { BlueprintFactory } from "../BlueprintFactory";
import { BlueprintStaticFun } from "./BlueprintStaticFun";

export function registerBlueprintFunctions() {
    const rf = BlueprintFactory.regFunction.bind(BlueprintFactory);
    rf("web_consoleLog", function (text: unknown) {
        console.log("[Blueprint]", text);
    });
    rf("equal", function (a, b) {
        return a == b;
    });
    rf("and", function (a, b) {
        return !!a && !!b;
    });
    rf("or", function (a, b) {
        return !!a || !!b;
    });
    rf("not", function (a) {
        return !a;
    });
    rf("isUndefined", function (a) {
        return a === undefined;
    });
    rf("isNull", function (a) {
        return a == null;
    });
    rf("isNaN", function (a) {
        return isNaN(a);
    });
    rf("toString", function (a) {
        return String(a);
    });
    rf("toNumber", function (a) {
        return Number(a);
    });
    rf("toBoolean", function (a) {
        return !!a;
    });
    rf("branch", BlueprintStaticFun.branch);
    rf("forEach", BlueprintStaticFun.forEach);
    rf("forEachWithBreak", BlueprintStaticFun.forEachWithBreak);
    rf("forLoop", BlueprintStaticFun.forLoop);
    rf("forLoopWithBreak", BlueprintStaticFun.forLoopWithBreak);
    rf(
        "event_on",
        function (eventName, cb) {
            this.on(eventName, this, cb);
        },
        true,
    );
    rf(
        "event_call",
        function (eventName, ...args) {
            this.event(eventName, args);
        },
        true,
    );
    rf(
        "event_off",
        function (eventName, cb) {
            this.off(eventName, this, cb);
        },
        true,
    );
    rf(
        "event_offAll",
        function (eventName, cb) {
            this.offAll(eventName);
        },
        true,
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
