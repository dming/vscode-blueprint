# Editor / host / shared / runtime layout

This document describes how to reorganize the codebase before and alongside `src/runtime/`. **Execution order:** confirm this plan, then apply moves in the phases below.

## Decisions (locked)

1. **Build tooling** lives under **`src/host/build/`** (not `src/build/`).
2. **Validation does not ship with runtime.** `validateBlueprintDocument` and related build-only checks stay on the host/tooling side; runtime may assume documents are already saved / trusted, or perform minimal defensive checks locally without depending on the full validator module.

## Directory semantics

### `src/shared/`

- **No** `vscode`, **no** React/DOM, **no** `fs` in module top-level (callers pass JSON strings or parsed `unknown`).
- **No** `*.test.ts` / Vitest (or any test-only deps) under `shared/` — unit tests that only need shared APIs live under **`src/host/build/`**; tests that cover **runtime ↔ shared** bridges live under **`src/runtime/`** (e.g. `adapter/documentToRuntimeAsset.test.ts`).
- Consumed by: **`src/host/`**, **`src/runtime/`**, and **`src/webview/`** (via relative imports such as **`../../shared/...`** from editor code).
- Holds: blueprint document model, config parsing types/logic, and any types that both editor and runtime need.

### `src/runtime/`

- Blueprint execution engine (`core/`) plus **`adapter/`** (init, optional fetch loader, **config + document bridges**).
- Depends only on **`src/shared/`** for parsers/types (plus browser/Node builtins). Does **not** import **`src/host/`**.

### `src/host/`

- VS Code extension entry, custom editor provider, output channels, commands.
- **`src/host/build/`**: validate / compile / emit TypeScript / run build / load config from disk — **tooling, not runtime**.
- May import `vscode`, `fs`, `path`; orchestrates webview and build.

### `src/webview/`

- React editor UI only (Vite `root: src/webview`).
- Imports **`src/shared/`** with **relative paths** (e.g. from `src/webview/editor/`: **`../../shared/...`**). There is **no** `src/*.ts` barrel — root-level TS files under `src/` are not part of the layering model (see `npm run check:ts-imports`).

---

## What lives in `shared`

| Item | Rationale |
|------|-----------|
| **`documentModel`** (types, `parseBlueprintDocumentJson`, normalize, template constants, merge helpers) | Single source of truth for `.bp.json` shape for editor, build, and runtime. |
| **`parseBlueprintConfig`** / **`parseEditorBlueprintConfig`** | Same `blueprint.config.json` semantics everywhere (editor config loader uses the shared parser). |
| **`blueprint-config.ts`** | Config-facing types: `NodeDef`, `BaseClassDef`, `LifecycleHookDef`, `GlobalEventChannelDef`, etc. |
| **`editor-protocol.ts`** | Webview ↔ extension message types (`EditorToHostMessage`, `HostToEditorMessage`, `NodeLayout`, …). Shared so **host** and **webview** both import the same definitions without `webview` importing `host/`. |

### Stays out of `shared` (host / tooling)

| Item | Rationale |
|------|-----------|
| **`validateBlueprintDocument`** | Per decision: **not part of runtime**; keep under **`src/host/build/`** (or `host/validation/` next to build). |
| **`compileBlueprintDocument`**, **`emitTypeScript`**, **`runBuild`**, **`loadBlueprintConfigForBuild`** | Build / codegen only; live under **`src/host/build/`**. |
| **`extension.ts`**, **`treeEditorProvider.ts`**, output/log channels | VS Code–specific. |

Runtime may duplicate **tiny** defensive checks (e.g. missing node id) if needed, without importing the full validator.

---

## Runtime asset JSON vs editor `.bp.json`

- **Editor** saves **`*.bp.json`**: `formatVersion`, `graph.nodes` / `edges`, `template`, `values`, `inherits`, etc. (`documentModel`).
- **Runtime core** consumes **`BlueprintAssetJson`**: `_$ver`, `extends`, `blueprintArr.*.arr` (serialized node/link payloads), optional `functions` — see [`sample/runtime-minimal.asset.json`](../sample/runtime-minimal.asset.json) and comments in [`sample/README.md`](../sample/README.md).
- **Bridges (in `src/runtime/adapter/`)**:
  - **`blueprintConfigToRuntimeExtends`**: parsed editor config → `extendsData` for `initBlueprintRuntime`.
  - **`documentToRuntimeAsset`**: MVP — single linear **exec** chain, templates **`Event.Start`** + **`Debug.Print`** only (maps Print → builtin **`web_consoleLog`** node).

---

## Web runtime playground

- **`examples/web-runtime/`**: second Vite app (port **5174**); **`publicDir`** = repo **`sample/`** so `fetch("/main.bp.json")` works.
- Scripts: **`npm run dev:web-runtime`**, **`npm run build:web-runtime`**, **`npm run export:blueprint-config`** (writes `sample/blueprint.config.json` from `blueprintConfig/manifest.ts` + decorators).
- Demo flow: minimal fixture JSON, then `blueprint.config.json` + `main.bp.json` → `documentToRuntimeAsset` → `BlueprintResource.parse` → call lifecycle method on generated subclass (e.g. `onStart()`).
- See [`examples/web-runtime/README.md`](../examples/web-runtime/README.md) for the editor/runtime pairing checklist.

---

## Types layout (current)

- **`src/shared/blueprint-config.ts`**: node defs, base classes, global event channel defs, shared JSON shapes.
- **`src/shared/editor-protocol.ts`**: webview ↔ extension IPC payload types (imported from **`src/host/`** and **`src/webview/`**).

Host imports these with **`../shared/...`**. Webview uses **`../../shared/...`** (from `src/webview/editor/`). Nothing under `src/shared/` should import `host` or `webview`.

---

## Logger

Today `extension.ts` imports from `webview/shared/misc/logger`. **Invert dependency:** move logger core to **`src/shared/logging/`** (or `src/host/logging/` if you prefer zero “utility” in shared). Extension and webview should not depend on each other for logging.

---

## Webview import path

- Editor code imports shared modules with **relative specifiers** (e.g. **`../../shared/blueprint/documentModel`** from `src/webview/editor/`). No path alias — **`tsconfig.webview.json`** and Vite use default resolution. Do not add **`src/*.ts`** barrels; `npm run check:ts-imports` forbids importing them.

Editor UI lives under **`src/webview/`** (Vite root).

---

## Migration phases (suggested order)

1. Create **`src/shared/`**; move **`documentModel`** + **`parseBlueprintConfig`** from `src/blueprint/`; fix imports in host, webview, and tests.
2. Keep config types in **`src/shared/blueprint-config.ts`**; keep IPC types in **`src/shared/editor-protocol.ts`** (not under `host/`, so webview never imports `host/` for types).
3. Move **`src/build/`** → **`src/host/build/`**; update **`extension.ts`**, **`treeEditorProvider.ts`**, **`esbuild`** entry if any script references paths, and all test imports.
4. Relocate **logger** out of `webview/shared` into shared or host; update **extension** (and webview if it uses the same helper).
5. Normalize webview imports to **`../../shared/...`** (or the correct relative depth) from each file.
6. **`src/runtime/`** holds the execution engine and adapters; keep **`README.md`** aligned with actual entry points and web demo commands.
7. Enforce folder import boundaries with **`scripts/ts-import.ts`** / **`npm run check:ts-imports`** (wired into **`verify:local`**).

---

## Tooling notes

- **esbuild** (extension): bundles `src/host/extension.ts`; ensure new paths under `src/host/` are included (default include of `src/**/*` is enough).
- **Root `tsconfig.json`**: `include` should cover `src/shared`, `src/host`, `src/runtime` (webview is excluded there; it uses **`tsconfig.webview.json`**).
- **Editor Vitest** (`src/webview/…`): uses the same relative imports to `src/shared/` as the editor bundle (no separate alias config required).
- **`npm run check:ts-imports`**: enforces which top-level folders under `src/` may import which others; also rejects imports of **`src/*.ts`** / **`src/*.tsx`** (no root-level modules).
- **Convention:** in `shared`: no imports from `host`, `runtime`, `vscode`, `react`, or **vitest**; no test files co-located in `shared/`. Runtime tests that need **Vitest** + **`fs`** live next to adapters under **`src/runtime/`**.

---

## Summary

| Path | Role |
|------|------|
| `src/shared/` | Document model, config parse, **`editor-protocol`** (IPC types), logging helpers; no VS Code / no UI. |
| `src/host/` | Extension, webview provider, logging/output; **`host/build/`** = validate / compile / emit / run build. |
| `src/runtime/` | Execution engine + adapters; bridges from shared document/config into `BlueprintAssetJson`; **examples/web-runtime** for browser smoke test. |
| `src/webview/` | Editor UI; consumes `shared` via relative imports. |

After this refactor, adding runtime features is: implement under `src/runtime/`, import types and parsers from `src/shared/`, keep strict build validation in `src/host/build/` only. Use **`npm run dev:web-runtime`** to validate browser behaviour against **`sample/`** assets.
