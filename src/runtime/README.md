# Blueprint runtime (`src/runtime`)

Execution engine for blueprint graphs (ported Laya-style core under `core/`).

- **Depends on** [`src/shared/`](../shared/) for document/config types and bridges (`adapter/documentToRuntimeAsset.ts`, `adapter/blueprintConfigToRuntimeExtends.ts`).
- **Does not** import [`src/host/build/`](../host/build/) or VS Code.

## Entry points

- **`adapter/initBlueprintRuntime.ts`**: merge class/event metadata JSON into `extendsData`, register nodes/functions, inject host adapters.
- **`core/BlueprintLoader.createBlueprintResourceFromJson`**: build a `BlueprintResource` from runtime asset JSON (`blueprintArr`, `_$ver`, …).
- **`adapter/documentToRuntimeAsset.ts`**: MVP converter from editor **`BlueprintDocument.main graph`** → runtime asset (linear `Event.Start` + `Debug.Print` chains only).
- **`adapter/blueprintConfigToRuntimeExtends.ts`**: map parsed **`blueprint.config.json`** (`parseEditorBlueprintConfig`) → `extendsData` keys per base class.

## Web demo

From repo root:

- `npm run dev:web-runtime` — Vite serves `examples/web-runtime/` with `sample/` as static files.
- `npm run build:web-runtime` — production bundle to `examples/web-runtime/dist/` (gitignored).
