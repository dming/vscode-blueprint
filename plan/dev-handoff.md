# Dev Handoff

## Last done

- Added pin hover type hint in `webview/editor/main.tsx`:
  - hovering input/output endpoint now shows `pinName (type)` tooltip
  - added `aria-label` with the same text for accessibility/readability
- Completed one manual smoke run pass on `plan/quick-feel-test-checklist.md` with user marks:
  - Most items marked `[-]` (pass)
  - No `x` items (no confirmed failure)
  - Two items still untested (`[ ]`):
    - Build issue click focus behavior
    - Multi-root warning scenario (`sample/multi-root-warning.bp.json` build + highlight)
- Filled first real `Smoke Run Notes` row:
  - Date: `2026-03-29`
  - Version: `2.0.1-24`
  - Result: `PARTIAL` (`26 pass / 0 fail / 2 untested`)
- Added minimal CI workflow `.github/workflows/verify-local.yml` and kept local one-step gate (`verify:local`) in place.
- Verified tests and build:
  - `npm run verify:local`: pass

## Current status

- Build: pass (`npm run build`)
- Build-validation tests: pass (`npm run test:build-validation`)
- Editor regression tests: pass (`npm run test:editor-regression`)
- Unified test command: pass (`npm run test:all`)
- One-step local gate: pass (`npm run verify:local`)
- Manual smoke status: mostly pass, 2 untested items, 0 failed items.
- Latest packaged version: `2.0.1-26`
- Known issues:
  - Continue validating pin/edge interaction behavior after validation extraction.
  - Keep watching for drag jitter regressions in large graphs.
  - Confirm warning UX clarity for multi-root conflict highlight intensity in actual smoke run.

## Next 3 tasks

1. Finish the 2 remaining smoke checks (`Build issue focus` and `multi-root-warning` build/highlight).
2. Optionally add status badge/section in `README.md` for CI + local verify command.
3. After finishing remaining smoke checks, update `Smoke Run Notes` result from `PARTIAL` to final status.

## Verify checklist

- [ ] Pin click creates/finishes connection reliably.
- [ ] Dragging nodes does not jitter near other nodes.
- [ ] Edge selection/deletion remains easy to hit.
- [ ] Root context menu enable/disable follows incoming-edge rule correctly.
- [ ] Root/legal/illegal background colors update correctly after connect/disconnect/delete.
- [ ] Node numbering keeps root as `0` and remains stable after edits.
- [ ] Localized root/connection hints show Chinese on zh locale and English otherwise.
