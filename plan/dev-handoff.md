# Dev Handoff

## Last done

- Added grouped two-level toolbox with collapsible sections.
- Added inspector top version label from extension host (`Blueprint Editor v<version>`).
- Stabilized drag behavior and reduced update/fileChanged feedback loops.
- Added auto layout action for one-click node arrangement.

## Current status

- Build: pass (`npm run build`)
- Latest packaged version: `2.0.1-9`
- Known issues:
  - Continue validating pin/edge interaction behavior after each UI change.
  - Keep watching for drag jitter regressions in large graphs.

## Next 3 tasks

1. Add "find node and focus" command/input in toolbox (`Ctrl/Cmd+F` flow).
2. Improve auto layout with spacing presets (compact/spacious).
3. Add lightweight interaction smoke test checklist updates after each feature.

## Verify checklist

- [ ] Pin click creates/finishes connection reliably.
- [ ] Dragging nodes does not jitter near other nodes.
- [ ] Edge selection/deletion remains easy to hit.
- [ ] Inspector top shows correct extension version.
- [ ] Auto layout removes obvious overlaps on messy graphs.
