import type { EditorBlueprintConfig } from "../../shared/blueprint/parseEditorBlueprintConfig";
import { BPType } from "../core/BlueprintDefs";

/**
 * Maps editor `blueprint.config.json` (parsed via {@link parseEditorBlueprintConfig})
 * into the `extendsData` shape expected by {@link initBlueprintRuntime} / {@link initBlueprintCore}:
 * one key per base class, with `events[]` describing lifecycle graph entry nodes.
 */
export function blueprintConfigToRuntimeExtends(cfg: EditorBlueprintConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const bc of cfg.baseClasses) {
    const events = bc.lifecycle.map((hook) => {
      const output: Array<{ name: string; type: string; id: string }> = [
        { name: "then", type: "exec", id: "out_-1" },
      ];
      for (const p of hook.outputs) {
        output.push({
          name: p.name,
          type: p.type,
          id: `out_${p.name}`,
        });
      }
      return {
        name: hook.name,
        id: `event_${hook.name}`,
        type: BPType.Event,
        bpType: "event",
        properties: [] as unknown[],
        output,
      };
    });
    out[bc.name] = {
      name: bc.name,
      events,
    };
  }
  return out;
}
