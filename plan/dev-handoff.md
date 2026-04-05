# Dev Handoff

## Last done (this pause)

- **Edge endpoints vs viewport (blueprint editor webview)** — `src/webview/editor/main.tsx`
  - **Problem:** Pin anchors from `getBoundingClientRect()` during render lag **one frame** behind `viewport` updates, so **edges did not follow nodes while panning/zooming the canvas**.
  - **Fix:** SVG edge paths (`edgePath`, `pendingEdgePath`) use **`getPinAnchorFromGeometry` only** — screen position from `node.x/y`, `viewport`, and layout constants (`NODE_BORDER_TOP_PX`, card head/body, description block, `FIRST_PIN_CENTER_FROM_PINS_TOP_PX`, `PIN_CENTER_STEP_PX`, etc.). Same-frame as node `style`, so pan/zoom stay aligned.
  - **Cleanup:** Removed DOM-only pin measurement (`getPinAnchor`), `pinButtonRefsRef` / `setPinButtonRef`, pin `ref={...}`, and unused `getPinButtonKey`.
  - **Note:** Static pin/edge alignment relies on geometry matching `src/webview/editor/style.scss`; if a few pixels drift, tune `getPinCenterYOffsetFromNodeTop` / related constants rather than reintroducing render-time DOM reads for edges.

- **Earlier in this cycle (still relevant):** pin hover type tooltip + `aria-label`, smoke checklist partial run, CI `verify-local` workflow, etc. (see git history).

## Current status

- Extension version: **`2.0.1-35`** (`package.json`).
- Build: expect pass — `npm run build`.
- Tests: expect pass — `npm run test:all` / `npm run verify:local` (re-run before next session if deps changed).
- Manual smoke: prior run had **2 untested** items on `plan/quick-feel-test-checklist.md` (build-issue focus, multi-root warning); **re-validate canvas pan + edge sync** on resume.

## Next 3 tasks

1. **Smoke / QA:** Complete the two untested checklist items; add a quick pass for **pan + zoom** while watching **edge endpoints vs pins**.
2. **If needed:** Sub-pixel tuning of `getPinCenterYOffsetFromNodeTop` / `getNodeHeight` vs real Ant Design Card layout (only if visual mismatch is reported).
3. **Housekeeping:** Update `Smoke Run Notes` in `plan/quick-feel-test-checklist.md` after the above; optionally bump version per `package-version-first` skill before packaging.

## Verify checklist (resume here)

- [ ] **Canvas pan / zoom:** edges stay glued to pin endpoints (no lag behind nodes).
- [ ] Pin click creates/finishes connection reliably.
- [ ] Dragging nodes does not jitter near other nodes; edges follow node positions while dragging.
- [ ] Edge selection/deletion remains easy to hit.
- [ ] Root context menu enable/disable follows incoming-edge rule correctly.
- [ ] Root/legal/illegal background colors update correctly after connect/disconnect/delete.
- [ ] Node numbering keeps root as `0` and remains stable after edits.
- [ ] Localized root/connection hints show Chinese on zh locale and English otherwise.
