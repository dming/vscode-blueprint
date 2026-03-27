# Blueprint Editor

VS Code visual blueprint editor for node graph workflows.

## Features

- Blueprint graph canvas (`nodes + edges`) with drag and connect
- Embedded inspector panel for selected node fields
- `.bp.json` file format with `formatVersion` and `graph` payload
- One-click build command from editor title bar
- VS Code dark/light theme adaptation

## Quick Start

### Open a blueprint file

- Create or open a `*.bp.json` file
- Right-click file in Explorer
- Select **Open With** -> **Blueprint Editor**

### Create a new blueprint project

- Right-click a folder in Explorer
- Run **Blueprint: Create Blueprint Project**

This creates:

- `main.bp.json` (sample graph)
- `blueprint.config.json` (node definition placeholder)
- `blueprint.project.json` (project metadata)

### Build

Click **Build** in editor title bar, then choose output folder.

Build output:

- Converts each `*.bp.json` to `*.compiled.json`
- Preserves relative workspace paths

## Blueprint File Schema (MVP)

```json
{
  "formatVersion": 1,
  "graph": {
    "id": "main",
    "name": "Main",
    "nodes": [],
    "edges": [],
    "variables": []
  },
  "metadata": {}
}
```

## Extension Settings

| Setting                        | Type    | Default                 | Description                                                       |
| ------------------------------ | ------- | ----------------------- | ----------------------------------------------------------------- |
| `blueprint.autoOpen`    | boolean | `true`                    | Auto-open `*.bp.json` files with this editor.           |
| `blueprint.nodeDefFile` | string  | `"blueprint.config.json"` | Node definition config path relative to workspace root. |

## Development

- Build: `npm run build`
- Package VSIX: `npm run package`
- Output logs: **View -> Output** -> channel **Blueprint**

## Requirements

- VS Code 1.85.0+

## License

MIT
