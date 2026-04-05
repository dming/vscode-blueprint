---
name: blueprint-json-contracts
description: >-
  Before changing blueprint.config.json or *.bp.json shapes (or parsers/adapters), read the shared JSON contract TypeScript files.
  Use when editing config, editor documents, serialization, migration, or runtime asset bridges.
---

# Blueprint JSON contracts

## Mandatory references

When work touches **project config**, **editor blueprint files**, or **JSON that crosses editor ↔ runtime**:

1. Read `src/shared/JsonType/BlueprintConfigType.ts` for **`blueprint.config.json`** (pin string rules, `baseClasses` as record only, required top-level keys with empty `[]`/`{}` allowed).
2. Read `src/shared/JsonType/BlueprintJsonTypes.ts` for **editor `*.bp.json`** (file-level and graph layout, legacy `graphs[]` note) and for **runtime asset JSON** (`BlueprintAssetJson`, etc.) in the same module.

Do not invent new top-level fields or pin conventions without updating these types and the parsers that consume them.

## Implementation source of truth (code, not only types)

- Config parsing: `src/shared/blueprint/parseEditorBlueprintConfig.ts`, `src/shared/blueprint/parseBlueprintConfig.ts`.
- Editor document normalization: `src/shared/blueprint/documentModel.ts` (`normalizeBlueprintDocumentValue`, `BlueprintDocument`).
- Normalized editor types are re-exported from `BlueprintJsonTypes.ts` from `documentModel.ts` (same names: `BlueprintDocument`, etc.).

After changing contracts or parsers, run `npm run check:ts-imports` and relevant tests (e.g. `npm run test:build-validation`).
