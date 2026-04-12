import * as fs from "fs";
import * as path from "path";
import { describe, expect, it, vi } from "vitest";
import { initBlueprintRuntime } from "../../../../src/runtime/adapter/initBlueprintRuntime";
import { createBlueprintResourceFromJson } from "../../../../src/runtime/core/BlueprintLoader";
import { BattleContext } from "./BattleContext";

const repoRoot = path.join(__dirname, "../../../..");
const sampleMain = path.join(repoRoot, "sample", "main.bp.json");
const sampleCfg = path.join(repoRoot, "sample", "blueprint.config.json");

describe("BattleContext sample editor load", () => {
    it("loads sample config + main.bp.json from disk, parses blueprint, and runs onStart", async () => {
        const configText = fs.readFileSync(sampleCfg, "utf8");
        const documentText = fs.readFileSync(sampleMain, "utf8");
        const battle = await BattleContext.loadFromEditorSample({
            configText,
            documentText,
            systems: [() => {}],
        });
        expect(battle.editorConfig.baseClasses.length).toBeGreaterThan(0);
        expect(battle.blueprintResource).not.toBeNull();
        expect(battle.blueprintResource?.cls).toBeDefined();
        expect(() => battle.runMainLifecycle()).not.toThrow();
    });

    /** Mirrors `examples/web-runtime/main.ts`: minimal fixture init, then BattleContext (second init). */
    it("logs [Blueprint] from Debug.Print after onStart (double init order)", async () => {
        const sampleDir = path.join(repoRoot, "sample");
        const extendsText = fs.readFileSync(
            path.join(sampleDir, "runtime-minimal.extends.json"),
            "utf8",
        );
        const assetText = fs.readFileSync(path.join(sampleDir, "runtime-minimal.asset.json"), "utf8");
        initBlueprintRuntime(JSON.parse(extendsText) as Record<string, unknown>, {
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
        const minimalAsset = JSON.parse(assetText) as Parameters<
            typeof createBlueprintResourceFromJson
        >[1];
        const minimalBp = createBlueprintResourceFromJson("minimal-fixture", minimalAsset);
        expect(minimalBp).not.toBeNull();
        minimalBp!.parse();

        const spy = vi.spyOn(console, "log").mockImplementation(() => {});
        try {
            const configText = fs.readFileSync(path.join(sampleDir, "blueprint.config.json"), "utf8");
            const documentText = fs.readFileSync(path.join(sampleDir, "main.bp.json"), "utf8");
            const battle = await BattleContext.loadFromEditorSample({
                configText,
                documentText,
                systems: [() => {}],
            });
            battle.runMainLifecycle();
            expect(
                spy.mock.calls.some(
                    (c) => c[0] === "[Blueprint]" && String(c[1]).includes("Hello from Blueprint sample"),
                ),
            ).toBe(true);
        } finally {
            spy.mockRestore();
        }
    });
});
