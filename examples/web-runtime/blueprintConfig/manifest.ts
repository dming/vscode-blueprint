/**
 * Authoritative blueprint project manifest for the **sample editor** workspace.
 * Run `npm run export:blueprint-config` to write `sample/blueprint.config.json`.
 */
import "../engine/core/ecs/component";
import { BlueprintBaseClass, BlueprintNodeDef, Lifecycle } from "./decorators";
import { setGlobalEventChannels, setRuntimeTemplates } from "./registry";

@BlueprintBaseClass("Actor")
class _SampleActorHost {
    @Lifecycle()
    onBeginPlay() {}

    @Lifecycle({ outputs: ["deltaTime:number"] })
    onTick() {}

    @Lifecycle()
    onEndPlay() {}
}

void _SampleActorHost;

setGlobalEventChannels([
    { id: "game.pause", payload: [] },
    { id: "ui.toast", payload: ["message:string", "severity:number"] },
]);

setRuntimeTemplates({
    globalEventEmit: "Engine.GlobalEvent.Emit",
    globalEventListen: "Engine.GlobalEvent.Listen",
});

/** Default `text` pin value for {@link _SampleNodePalette._debugPrint} / `Debug.Print` node def. */
const SAMPLE_DEBUG_PRINT_DEFAULT_TEXT = "Hello from Blueprint sample";

/** Node palette entries (static methods carry @BlueprintNodeDef metadata only). */
class _SampleNodePalette {
    @BlueprintNodeDef({
        name: "Event.Start",
        title: "Event Start",
        category: "Event",
        outputs: ["exec:exec"],
        desc: "Blueprint execution entry.",
    })
    static _eventStart() {}

    @BlueprintNodeDef({
        name: "Debug.Print",
        title: "Print",
        category: "Debug",
        inputs: ["exec:exec", "text:string"],
        outputs: ["exec:exec"],
        defaults: { text: SAMPLE_DEBUG_PRINT_DEFAULT_TEXT },
        desc: "Print text for testing graph flow.",
    })
    static _debugPrint(text: string = SAMPLE_DEBUG_PRINT_DEFAULT_TEXT): void {
        // Not used by `export:blueprint-config`; mirrors runtime `web_consoleLog` for ad-hoc / manual calls.
        console.warn(`[Sample manifest / Debug.Print] ${text}`);
    }

    @BlueprintNodeDef({
        name: "Math.AddInt",
        title: "Add Int",
        category: "Math",
        inputs: ["a:number", "b:number"],
        outputs: ["result:number"],
        defaults: { a: 1, b: 2 },
        desc: "Simple numeric node for type-link demo.",
    })
    static _mathAddInt() {}

    @BlueprintNodeDef({
        name: "Flow.FunctionEntry",
        title: "Function Entry",
        category: "Flow",
        outputs: ["exec:exec"],
        desc: "Function graph entry; add output pins for parameters (they appear as inputs on Invoke Function nodes).",
    })
    static _flowFunctionEntry() {}

    @BlueprintNodeDef({
        name: "Flow.FunctionReturn",
        title: "Return",
        category: "Flow",
        inputs: ["exec:exec"],
        desc: "Ends the function; add non-exec input pins for return values (they appear as outputs on Invoke Function nodes).",
    })
    static _flowFunctionReturn() {}

    @BlueprintNodeDef({
        name: "Flow.InvokeFunction",
        title: "Invoke Function",
        category: "Flow",
        inputs: ["exec:exec"],
        outputs: ["exec:exec"],
        defaults: { functionId: "" },
        desc: "Call a user function (set target in Inspector, or drag the function from My Blueprint onto the canvas).",
    })
    static _flowInvokeFunction() {}

    @BlueprintNodeDef({
        name: "Flow.DispatcherEntry",
        title: "Dispatcher Entry",
        category: "Flow",
        outputs: ["exec:exec"],
        desc: "Listener graph entry; add output pins for broadcast payload (same names become Broadcast inputs).",
    })
    static _flowDispatcherEntry() {}

    @BlueprintNodeDef({
        name: "Flow.BroadcastDispatcher",
        title: "Broadcast Dispatcher",
        category: "Flow",
        inputs: ["exec:exec"],
        outputs: ["exec:exec"],
        defaults: { dispatcherId: "" },
        desc: "Broadcast a declared dispatcher from the main or a function graph (set target in Inspector).",
    })
    static _flowBroadcastDispatcher() {}

    @BlueprintNodeDef({
        name: "Flow.BindDispatcherListener",
        title: "Bind Dispatcher Listener",
        category: "Flow",
        inputs: ["exec:exec"],
        outputs: ["exec:exec"],
        defaults: { dispatcherId: "", functionId: "" },
        desc: "At runtime, register a function as an extra listener for a dispatcher (after static listener graph).",
    })
    static _flowBindDispatcherListener() {}

    @BlueprintNodeDef({
        name: "Flow.ClearDispatcherListeners",
        title: "Clear Dispatcher Listeners",
        category: "Flow",
        inputs: ["exec:exec"],
        outputs: ["exec:exec"],
        defaults: { dispatcherId: "" },
        desc: "Clear dynamically bound listeners for a dispatcher (static dispatch_* graph is unchanged).",
    })
    static _flowClearDispatcherListeners() {}

    @BlueprintNodeDef({
        name: "Engine.GlobalEvent.Emit",
        title: "Emit Global Event",
        category: "Engine",
        inputs: ["exec:exec"],
        outputs: ["exec:exec"],
        defaults: { channelId: "" },
        desc: "Emit a cross-blueprint event (channel + payload from globalEventChannels in blueprint.config.json).",
    })
    static _engineGlobalEventEmit() {}

    @BlueprintNodeDef({
        name: "Engine.GlobalEvent.Listen",
        title: "On Global Event",
        category: "Engine",
        outputs: ["exec:exec"],
        defaults: { channelId: "" },
        desc: "Main graph entry for a global channel; payload outputs match the channel manifest.",
    })
    static _engineGlobalEventListen() {}
}

void _SampleNodePalette;
