# Web runtime example

This Vite app loads the same assets as the **editor sample** workspace under [`sample/`](../../sample/): `vite.config.ts` sets `publicDir` to that folder, so `fetch("/main.bp.json")` and `fetch("/blueprint.config.json")` match what the VS Code extension opens when you develop against the sample project.

## Strict pairing with `sample/`

| Concern | Location |
|--------|----------|
| Editor graph + `inherits` | [`sample/main.bp.json`](../../sample/main.bp.json) |
| Node palette, base classes, global events | [`sample/blueprint.config.json`](../../sample/blueprint.config.json) — **generated** from this folder (see below) |
| Host base name for the sample graph (`Component`) | [`blueprintConfig/constants.ts`](./blueprintConfig/constants.ts) (`SAMPLE_EDITOR_HOST_BASE_CLASS`) |

After changing node defs or base classes, regenerate the editor config and keep parity with the sample file:

```bash
npm run export:blueprint-config
```

Implementation lives in [`blueprintConfig/manifest.ts`](./blueprintConfig/manifest.ts): **class** decorators for blueprint host bases (`@BlueprintBaseClass`, `@Lifecycle`), **static method** decorators for palette entries (`@BlueprintNodeDef`), plus small helpers for global channels and runtime template ids.

CI runs `npm run test:blueprint-config-parity` (see root `package.json`) so the manifest and `sample/blueprint.config.json` cannot drift in meaning.

## BattleContext (game + sample blueprint)

[`engine/game/BattleContext.ts`](./engine/game/BattleContext.ts) owns the ECS `World` / `BattleWork` and can load the same editor sample as the page demo via **`BattleContext.loadFromEditorSample()`** (optional `configText` / `documentText` for tests). After load, call **`runMainLifecycle()`** to run the graph’s `onStart()` entry (same as the former inline demo in `main.ts`).

Regression (reads `sample/` from disk, no browser):

```bash
npm run test:battle-context-sample
```

## Commands

- `npm run dev:web-runtime` — dev server (port **5174**).
- `npm run build:web-runtime` — production build to `dist/`.
- `npm run export:blueprint-config` — bundle the export entry with esbuild, run it, write `sample/blueprint.config.json`.

The esbuild output is written to `examples/web-runtime/scripts/exportBlueprintConfig.bundle.cjs` (gitignored). If `esbuild` on your PATH misbehaves, the npm script invokes `node node_modules/esbuild/bin/esbuild` explicitly.
