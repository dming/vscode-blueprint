import { parseBlueprintDocumentJson } from "../../../../src/shared/blueprint/documentModel";
import type { EditorBlueprintConfig } from "../../../../src/shared/blueprint/parseEditorBlueprintConfig";
import { parseEditorBlueprintConfig } from "../../../../src/shared/blueprint/parseEditorBlueprintConfig";
import { blueprintConfigToRuntimeExtends } from "../../../../src/runtime/adapter/blueprintConfigToRuntimeExtends";
import { documentToRuntimeAsset } from "../../../../src/runtime/adapter/documentToRuntimeAsset";
import { initBlueprintRuntime } from "../../../../src/runtime/adapter/initBlueprintRuntime";
import { createBlueprintResourceFromJson } from "../../../../src/runtime/core/BlueprintLoader";
import type { BlueprintResource } from "../../../../src/runtime/core/BlueprintResource";
import { createHostClassForBlueprint } from "../../hostClass";
import { SAMPLE_EDITOR_HOST_BASE_CLASS } from "../../blueprintConfig/constants";
import { Component, type SystemFn, Scheduler, World } from "../core";

/** Runs ECS systems for one battle; game main loop calls {@link BattleSystemRunner.update}. */
export class BattleSystemRunner {
    private readonly world: World;
    private readonly scheduler: Scheduler;

    constructor(world: World, systems: readonly SystemFn[]) {
        this.world = world;
        this.scheduler = new Scheduler(world, systems);
    }

    /** Systems first, then {@link World.update} (all components' {@link Component.onUpdate}). */
    update(deltaMs: number): void {
        this.scheduler.tick(deltaMs);
        this.world.update(deltaMs);
    }
}

export class BattleWork {
    readonly system: BattleSystemRunner;

    constructor(world: World, systems: readonly SystemFn[]) {
        this.system = new BattleSystemRunner(world, systems);
    }
}

/** Marker component for entities owned by the sample battle. */
export class BattleEntityTag extends Component {
    constructor(readonly label: string) {
        super();
    }
}

function createDefaultBattleSystems(): SystemFn[] {
    return [() => {}];
}

export type LoadEditorSampleOptions = {
    /** Raw `blueprint.config.json`; if omitted, uses `fetch("/blueprint.config.json")` (browser). */
    configText?: string;
    /** Raw `main.bp.json`; if omitted, uses `fetch("/main.bp.json")` (browser). */
    documentText?: string;
    /** ECS systems passed to {@link BattleWork}; defaults to a no-op system. */
    systems?: readonly SystemFn[];
    /** Document → asset conversion entry hook; default matches web demo. */
    lifecycleHook?: "onStart";
};

/**
 * One battle session: ECS {@link World}, optional sample editor blueprint loaded via {@link BattleContext.loadFromEditorSample}.
 */
export class BattleContext {
    readonly world: World;
    readonly work: BattleWork;

    /** Set after {@link BattleContext.loadFromEditorSample} succeeds. */
    editorConfig!: EditorBlueprintConfig;

    /** Parsed sample main blueprint; set after successful load. */
    blueprintResource: BlueprintResource | null = null;

    private constructor(systems: readonly SystemFn[]) {
        this.world = new World();
        const demo = this.world.spawn();
        this.world.addComponent(demo, new BattleEntityTag("demo"));
        this.work = new BattleWork(this.world, systems);
    }

    /**
     * Loads `blueprint.config.json` + `main.bp.json` (or injected texts), initializes runtime, parses blueprint asset.
     */
    static async loadFromEditorSample(options?: LoadEditorSampleOptions): Promise<BattleContext> {
        const systems = options?.systems ?? createDefaultBattleSystems();
        const ctx = new BattleContext(systems);
        await ctx.loadEditorSample(options);
        return ctx;
    }

    async loadEditorSample(options?: LoadEditorSampleOptions): Promise<void> {
        const lifecycleHook = options?.lifecycleHook ?? "onStart";
        const cfgText =
            options?.configText != null
                ? options.configText
                : await fetch("/blueprint.config.json").then((r) => {
                      if (!r.ok) {
                          throw new Error(`Failed to fetch blueprint.config.json: ${r.status}`);
                      }
                      return r.text();
                  });
        const docText =
            options?.documentText != null
                ? options.documentText
                : await fetch("/main.bp.json").then((r) => {
                      if (!r.ok) {
                          throw new Error(`Failed to fetch main.bp.json: ${r.status}`);
                      }
                      return r.text();
                  });

        const editorCfg = parseEditorBlueprintConfig(JSON.parse(cfgText) as unknown);
        this.editorConfig = editorCfg;
        const extendsObj = blueprintConfigToRuntimeExtends(editorCfg);
        const baseName = SAMPLE_EDITOR_HOST_BASE_CLASS;
        const HostCtor = createHostClassForBlueprint(baseName, editorCfg);

        initBlueprintRuntime(extendsObj, {
            reflection: {
                getClassByName(name: string) {
                    return name === baseName ? (HostCtor as new () => object) : null;
                },
            },
        });

        const doc = parseBlueprintDocumentJson(docText);
        if (doc.formatVersion !== 1 || !doc.graph?.nodes?.length) {
            throw new Error("Unexpected blueprint document after parse (empty or legacy?)");
        }
        const conv = documentToRuntimeAsset(doc, { lifecycleHook });
        if (!conv.ok) {
            throw new Error(`documentToRuntimeAsset: ${conv.error}`);
        }

        const bp = createBlueprintResourceFromJson("main-bp", conv.asset);
        if (!bp) {
            throw new Error("createBlueprintResourceFromJson returned null");
        }
        bp.parse();
        if (!bp.cls) {
            throw new Error("Blueprint parse produced no generated class");
        }
        this.blueprintResource = bp;
    }

    /** Invokes `onStart()` on the generated subclass (matches web demo). */
    runMainLifecycle(): void {
        const bp = this.blueprintResource;
        if (!bp?.cls) {
            throw new Error("No loaded blueprint; call loadFromEditorSample first");
        }
        const Cls = bp.cls as unknown as new () => { onStart(): void };
        const inst = new Cls();
        inst.onStart();
    }
}
