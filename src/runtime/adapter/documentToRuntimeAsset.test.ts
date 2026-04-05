import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { parseBlueprintDocumentJson } from "../../shared/blueprint/documentModel";
import { documentToRuntimeAsset } from "./documentToRuntimeAsset";

const repoRoot = path.resolve(__dirname, "../../..");
const sampleMain = path.join(repoRoot, "sample", "main.bp.json");

describe("documentToRuntimeAsset", () => {
  it("converts onStart → Debug.Print chain from sample/main.bp.json", () => {
    const text = fs.readFileSync(sampleMain, "utf-8");
    const doc = parseBlueprintDocumentJson(text);
    expect(doc.inherits).toBe("Component");
    const r = documentToRuntimeAsset(doc, { lifecycleHook: "onStart" });
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect(r.asset._$ver).toBe(1);
    expect(r.asset.extends).toBe("Component");
    const arr = r.asset.blueprintArr?.main?.arr;
    expect(Array.isArray(arr)).toBe(true);
    expect(arr!.length).toBe(2);
    expect(arr![0].cid).toBe("event_onStart");
    expect(arr![0].target).toBe("Component");
    expect(arr![1].cid).toBe("web_consoleLog");
    expect((arr![1].inputValue as { text?: string })?.text).toContain("Hello from Blueprint sample");
  });
});
