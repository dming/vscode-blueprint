# Dev Handoff

## Last done

- Added node right-click context menu with `Set As Root Node`.
- Added root-node concept to graph data (`isRoot`) and enforced single global root.
- Added root eligibility validation:
  - A node can be set as global root only if it is the root of its connected tree (no incoming edges in that tree).
  - Context menu action auto-disables for ineligible nodes.
- Added node-tree legality model by connectivity:
  - Tree containing global root is legal.
  - Other connected trees are illegal.
- Added node numbering on title row (right aligned):
  - Global root fixed to `0`.
  - Other nodes auto-numbered for display.
- Updated visual semantics:
  - Root node background: bright green.
  - Legal tree non-root node background: very light gray.
  - Illegal tree node background: red (same tone as output pin text).
- Completed multiple packaging iterations and produced latest installable VSIX.

## Current status

- Build: pass (`npm run build`)
- Latest packaged version: `2.0.1-21`
- Known issues:
  - Continue validating pin/edge interaction behavior after root/tree style changes.
  - Keep watching for drag jitter regressions in large graphs.
  - Confirm root-eligibility rule on corner cases (cycles/multiple entry candidates).

## Next 3 tasks

1. Add localized UI copy for root validation/error hints (CN/EN consistency).
2. Add optional visual legend in canvas for root/legal/illegal color meaning.
3. Add automated graph-state unit checks (root eligibility, legality partition, numbering stability).

## Verify checklist

- [ ] Pin click creates/finishes connection reliably.
- [ ] Dragging nodes does not jitter near other nodes.
- [ ] Edge selection/deletion remains easy to hit.
- [ ] Root context menu enable/disable follows incoming-edge rule correctly.
- [ ] Root/legal/illegal background colors update correctly after connect/disconnect/delete.
- [ ] Node numbering keeps root as `0` and remains stable after edits.
