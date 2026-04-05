---
name: blueprint-dev-resume
description: Resume blueprint editor development quickly with a fixed startup checklist, regression checks, and end-of-session handoff updates. Use when user says continue development, resume work, or asks to keep iteration momentum.
---

# Blueprint Dev Resume

## Purpose

Reduce context warm-up time for ongoing development in this repository.

## Startup Workflow

When user asks to continue development:

1. Read `plan/dev-handoff.md`.
2. Read `plan/blueprint-migration-checklist.md`.
3. Read current version from `package.json`.
4. Identify next implementation target:
   - Prefer `Next 3 tasks` in `plan/dev-handoff.md`.
   - If empty, pick highest-value unchecked item from checklist.

## Execution Rules

- For `blueprint.config.json` or `*.bp.json` shape / parsing / adapters, follow the `blueprint-json-contracts` skill (read the two `src/shared/JsonType/*.ts` contract files first).
- After substantive code edits, run `npm run build`.
- Mention changed files and build result in the response.
- Keep regression awareness for these high-frequency risks:
  - Node drag jitter
  - Pin click vs node drag conflict
  - Edge selection/deletion hit area
  - Inspector version label visibility
  - Auto layout usability

## Packaging Rule

If user asks to package, apply `package-version-first` skill:

- bump `package.json` version first
- then run `npm run package`
- return version + absolute VSIX path

## End-of-Session Handoff Update

Before finishing a development turn, update `plan/dev-handoff.md`:

- `Last done`
- `Current status`
- `Next 3 tasks`
- `Verify checklist`

Keep it concise and actionable.
