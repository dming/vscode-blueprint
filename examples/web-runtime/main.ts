import { initBlueprintRuntime } from "../../src/runtime/adapter/initBlueprintRuntime";
import { createBlueprintResourceFromJson } from "../../src/runtime/core/BlueprintLoader";
import { BattleContext } from "./engine/game";

const logEl = document.getElementById("log")!;

function log(line: string) {
    logEl.textContent += `${line}\n`;
}

async function runMinimalFixture() {
    log("— Minimal fixture (runtime-minimal.*.json) —");
    const [extendsText, assetText] = await Promise.all([
        fetch("/runtime-minimal.extends.json").then((r) => r.text()),
        fetch("/runtime-minimal.asset.json").then((r) => r.text()),
    ]);
    const extendsObj = JSON.parse(extendsText) as Record<string, unknown>;
    initBlueprintRuntime(extendsObj, {
        reflection: {
            getClassByName(name: string) {
                if (name === "DemoHost") {
                    return class DemoHost {
                        onBeginPlay() {}
                    } as unknown as new () => object;
                }
                return null;
            },
        },
    });

    const asset = JSON.parse(assetText) as Parameters<typeof createBlueprintResourceFromJson>[1];
    const bp = createBlueprintResourceFromJson("minimal-fixture", asset);
    if (!bp) {
        log("ERROR: createBlueprintResourceFromJson returned null");
        return;
    }
    bp.parse();
    const Cls = bp.cls;
    if (!Cls) {
        log("ERROR: no generated class");
        return;
    }
    const inst = new (Cls as unknown as new () => { onBeginPlay(): void })();
    inst.onBeginPlay();
    log("Called onBeginPlay(); see console for [Blueprint] log line.");
}

async function runFromEditorFiles(): Promise<BattleContext> {
    log("— sample/main.bp.json + blueprint.config.json (BattleContext → onStart) —");
    const battle = await BattleContext.loadFromEditorSample();
    battle.runMainLifecycle();
    log("Called onStart(); see console for [Blueprint] output.");
    return battle;
}

/** Sample game loop: tick ECS on the same {@link BattleContext} after blueprint load. */
function runBattleMainLoop(battle: BattleContext): Promise<void> {
    log("— BattleContext + ECS (requestAnimationFrame x3) —");
    let last = performance.now();
    let frames = 0;
    const maxFrames = 3;
    return new Promise((resolve) => {
        const step = (now: number) => {
            const deltaMs = Math.min(Math.max(now - last, 0), 100);
            last = now;
            battle.work.system.update(deltaMs);
            frames++;
            if (frames < maxFrames) {
                requestAnimationFrame(step);
            } else {
                log(`battle.work.system.update x${maxFrames}; world.entityCount=${battle.world.entityCount}`);
                resolve();
            }
        };
        requestAnimationFrame(step);
    });
}

async function main() {
    logEl.textContent = "";
    log("Blueprint web runtime demo\n");
    try {
        await runMinimalFixture();
        log("");
        const battle = await runFromEditorFiles();
        log("");
        await runBattleMainLoop(battle);
        log("\nDone.");
    } catch (e) {
        log(`FATAL: ${e instanceof Error ? e.message : String(e)}`);
        console.error(e);
    }
}

document.getElementById("run")!.addEventListener("click", () => {
    void main();
});

void main();
