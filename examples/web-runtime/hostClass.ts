import type { EditorBlueprintConfig } from "../../src/shared/blueprint/parseEditorBlueprintConfig";

/**
 * Build a trivial host class the runtime can subclass; lifecycle methods are empty stubs
 * that the generated blueprint subclass overrides to run the graph.
 *
 * Lifecycle names must match `blueprint.config.json` for the chosen base class
 * (see `blueprintConfig/manifest.ts` + `npm run export:blueprint-config` → `sample/`).
 */
export function createHostClassForBlueprint(
  baseName: string,
  cfg: EditorBlueprintConfig,
): new () => object {
  const bc = cfg.baseClasses.find((b) => b.name === baseName);
  const methods = bc?.lifecycle.map((l) => l.name) ?? ["onBeginPlay"];

  const safeName = baseName.replace(/[^a-zA-Z0-9_]/g, "_") || "Host";
  const body = methods.map((m) => `${m}() {}`).join(" ");
  const factory = new Function(`return class ${safeName} { ${body} }`);
  return factory() as new () => object;
}
