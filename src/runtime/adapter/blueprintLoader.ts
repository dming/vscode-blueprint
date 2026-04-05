import { BlueprintResource } from "../core/BlueprintResource";
import { createBlueprintResourceFromJson } from "../core/BlueprintLoader";
import type { BlueprintAssetJson } from "../../shared/JsonType/BlueprintJsonTypes";

function getFileName(url: string) {
  const q = url.indexOf("?");
  const clean = q >= 0 ? url.slice(0, q) : url;
  const slash = Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\"));
  return slash >= 0 ? clean.slice(slash + 1) : clean;
}

function getPath(url: string) {
  const q = url.indexOf("?");
  const clean = q >= 0 ? url.slice(0, q) : url;
  const slash = Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\"));
  return slash >= 0 ? clean.slice(0, slash + 1) : "";
}

function join(basePath: string, rel: string) {
  if (!basePath) return rel;
  if (
    /^[a-zA-Z]+:\/\//.test(rel) ||
    rel.startsWith("/") ||
    rel.startsWith("\\") ||
    rel.startsWith("res://")
  ) {
    return rel;
  }
  const b = basePath.endsWith("/") || basePath.endsWith("\\") ? basePath : basePath + "/";
  return b + rel;
}

function isUUID(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
}

/** Task shape compatible with Laya-style loader pipelines (`fetch` + `load`). */
export interface BlueprintLoaderTask {
  url: string;
  uuid?: string;
  loader: {
    fetch(url: string, type: string, progress?: unknown, options?: unknown): Promise<unknown>;
    load(urls: string[]): Promise<unknown[]>;
  };
  progress: { createCallback(n: number): unknown };
  options?: unknown;
}

/**
 * Host-side blueprint asset loading: fetch JSON, then optional preload bundle.
 * Core runtime only needs {@link createBlueprintResourceFromJson} when you already have JSON.
 */
export class BlueprintLoader {
  public load(task: BlueprintLoaderTask): Promise<BlueprintResource | null> {
    return task.loader
      .fetch(task.url, "json", task.progress.createCallback(0.8), task.options)
      .then((data) => {
        if (!data) return null;
        const json = data as BlueprintAssetJson;
        const bid = task.uuid || task.url;
        const name = getFileName(task.url);
        return createBlueprintResourceFromJson(bid, json, { name });
      });
  }

  public postLoad(task: BlueprintLoaderTask, bp: BlueprintResource): Promise<void> {
    if (bp.data.preload) {
      const basePath = getPath(task.url);
      const urls = bp.data.preload.map((s) => (isUUID(s) ? "res://" + s : join(basePath, s)));
      return task.loader.load(urls).then((resArray) => {
        bp.addDeps(resArray);
        bp.parse();
      });
    }
    return Promise.resolve();
  }
}
