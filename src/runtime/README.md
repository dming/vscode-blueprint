# Blueprint runtime (`src/runtime`)

Execution engine for blueprint graphs (ported Laya-style core under `core/`).

- **Depends on** [`src/shared/`](../shared/) for document/config types and bridges (`adapter/documentToRuntimeAsset.ts`, `adapter/blueprintConfigToRuntimeExtends.ts`).
- **Does not** import [`src/host/build/`](../host/build/) or VS Code.

## Entry points

- **`adapter/initBlueprintRuntime.ts`**: merge class/event metadata JSON into `extendsData`, register nodes/functions, inject host adapters.
- **`core/BlueprintLoader.createBlueprintResourceFromJson`**: build a `BlueprintResource` from runtime asset JSON (`blueprintArr`, `_$ver`, …).
- **`adapter/documentToRuntimeAsset.ts`**: MVP converter from editor **`BlueprintDocument.main graph`** → runtime asset (linear `Event.Start` + `Debug.Print` chains only).
- **`adapter/blueprintConfigToRuntimeExtends.ts`**: map parsed **`blueprint.config.json`** (`parseEditorBlueprintConfig`) → `extendsData` keys per base class.

## Gap: full editor graph → `BlueprintAssetJson`

`documentToRuntimeAsset` is intentionally **narrow** (linear exec, two templates, single lifecycle entry). A full arbitrary `.bp.json` (branching, `functions`, `dispatchers`, invoke/broadcast nodes, etc.) is **not** converted here.

**Options for future work** (pick based on product):

1. **Extend `documentToRuntimeAsset`** — incrementally add patterns (branching exec, more templates) while keeping tests next to the adapter.
2. **New adapter** — e.g. `documentToRuntimeAssetFull.ts` that shares helpers with `documentToRuntimeAsset` but targets a fuller `BlueprintAssetJson`; keep MVP path for demos.
3. **Host-only codegen path** — `src/host/build/compileBlueprint.ts` + `emitTypeScript.ts` produce TS / metadata for tooling; pairing that output with a **separate** asset emitter would duplicate graph knowledge unless unified in `shared/`.

Host validation (`validateBlueprintDocument`) and compile metadata **do not** replace a complete graph-to-asset serializer; see tests in `documentToRuntimeAsset.test.ts` for MVP error messages.

High-level workflow for contributors: **`AGENTS.md`** (repo root).

## Web demo

From repo root:

- `npm run dev:web-runtime` — Vite serves `examples/web-runtime/` with `sample/` as static files.
- `npm run build:web-runtime` — production bundle to `examples/web-runtime/dist/` (gitignored).
