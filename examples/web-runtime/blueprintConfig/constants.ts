/**
 * Host base class for `sample/main.bp.json` in this repo. Must match
 * `@BlueprintBaseClass(...)` for the Component host in `manifest.ts` and the
 * document `inherits` field the editor uses for that asset.
 */
export const SAMPLE_EDITOR_HOST_BASE_CLASS = "Component" as const;
