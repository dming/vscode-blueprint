# Blueprint Sample

This folder is a ready-to-run sample for the Blueprint Editor extension.

## Files

- `main.bp.json`: sample graph to open and edit
- `multi-root-warning.bp.json`: sample graph that intentionally has 2 root nodes (for warning/highlight smoke test)
- `blueprint.config.json`: node template definitions used by "Add Node"

## Quick Try

1. Open `main.bp.json`
2. Right-click -> **Open With** -> **Blueprint Editor**
3. In toolbar, pick a node template and click **Add Node**
4. Connect output pin to input pin
5. Click **Build**, choose an output folder

Build result will generate:

- `main.compiled.json`

