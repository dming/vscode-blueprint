/**
 * Writes `sample/blueprint.config.json` from `examples/web-runtime/blueprintConfig/manifest.ts`.
 * Bundled with esbuild (see `npm run export:blueprint-config`).
 */
import * as fs from "fs";
import * as path from "path";
import "../blueprintConfig/manifest";
import { getBlueprintConfigRoot } from "../blueprintConfig/registry";

const outPath = path.join(__dirname, "../../../sample/blueprint.config.json");
const root = getBlueprintConfigRoot();
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(root, null, 2)}\n`, "utf8");
// eslint-disable-next-line no-console
console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
