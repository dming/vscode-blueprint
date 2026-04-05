import { parseBlueprintDocumentJson } from "../../src/shared/blueprint/documentModel";
import { parseEditorBlueprintConfig } from "../../src/shared/blueprint/parseEditorBlueprintConfig";
import { blueprintConfigToRuntimeExtends } from "../../src/runtime/adapter/blueprintConfigToRuntimeExtends";
import { documentToRuntimeAsset } from "../../src/runtime/adapter/documentToRuntimeAsset";
import { initBlueprintRuntime } from "../../src/runtime/adapter/initBlueprintRuntime";
import { createBlueprintResourceFromJson } from "../../src/runtime/core/BlueprintLoader";
import { BlueprintUtil } from "../../src/runtime/core/BlueprintUtil";
import { createHostClassForBlueprint } from "./hostClass";

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
          } as unknown as (new () => object);
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
  const inst = new (Cls as new () => { onBeginPlay(): void })();
  inst.onBeginPlay();
  log("Called onBeginPlay(); see console for [Blueprint] log line.");
}

async function runFromEditorFiles() {
  log("— sample/main.bp.json + blueprint.config.json (onStart → Debug.Print) —");
  const [cfgText, docText] = await Promise.all([
    fetch("/blueprint.config.json").then((r) => r.text()),
    fetch("/main.bp.json").then((r) => r.text()),
  ]);
  const editorCfg = parseEditorBlueprintConfig(JSON.parse(cfgText) as unknown);
  const extendsObj = blueprintConfigToRuntimeExtends(editorCfg);
  const baseName = "Component";
  const HostCtor = createHostClassForBlueprint(baseName, editorCfg);

  initBlueprintRuntime(extendsObj, {
    reflection: {
      getClassByName(name: string) {
        return name === baseName ? (HostCtor as (new () => object)) : null;
      },
    },
  });

  const doc = parseBlueprintDocumentJson(docText);
  if (doc.formatVersion !== 1 || !doc.graph?.nodes?.length) {
    log("ERROR: unexpected document after parse (empty or legacy?)");
    return;
  }
  const conv = documentToRuntimeAsset(doc, { lifecycleHook: "onStart" });
  if (!conv.ok) {
    log(`ERROR: documentToRuntimeAsset: ${conv.error}`);
    return;
  }

  const bp = createBlueprintResourceFromJson("main-bp", conv.asset);
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
  const inst = new (Cls as new () => { onStart(): void })();
  inst.onStart();
  log("Called onStart(); see console for [Blueprint] output.");
}

async function main() {
  logEl.textContent = "";
  log("Blueprint web runtime demo\n");
  try {
    await runMinimalFixture();
    log("");
    await runFromEditorFiles();
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
