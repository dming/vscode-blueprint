import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { parseEditorBlueprintConfig } from "../../../src/shared/blueprint/parseEditorBlueprintConfig";
import { getBlueprintConfigRoot, resetRegistry } from "./registry";

describe("blueprintConfig manifest vs sample/blueprint.config.json", () => {
  it("parses to the same EditorBlueprintConfig as the editor sample file", async () => {
    resetRegistry();
    await import("./manifest");
    const fromManifest = getBlueprintConfigRoot();
    const samplePath = path.join(__dirname, "../../../sample/blueprint.config.json");
    const fromDisk = JSON.parse(fs.readFileSync(samplePath, "utf8")) as unknown;
    expect(parseEditorBlueprintConfig(fromManifest as unknown)).toEqual(parseEditorBlueprintConfig(fromDisk));
  });
});
