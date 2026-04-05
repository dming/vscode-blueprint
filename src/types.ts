/**
 * Shared message protocol types between Extension Host and Webview.
 */

export type NodeLayout = "normal" | "compact";

export type NodeDefPin = {
  name: string;
  type: string;
};

export type NodeDef = {
  name: string;
  title?: string;
  category?: string;
  type?: string;
  desc?: string;
  icon?: string;
  inputs?: NodeDefPin[];
  outputs?: NodeDefPin[];
  defaults?: Record<string, string | number | boolean>;
};

/**
 * One lifecycle callback on an inherited base class.
 * `outputs` use the same pin string format as `nodeDefs` (e.g. `"deltaTime:number"`).
 * In config JSON you may use `"params"` instead of `"outputs"` (callback parameters appear as Event.Start output pins).
 * Inputs on Event.Start come only from the `Event.Start` nodeDef template — lifecycle does not declare inputs.
 */
export type LifecycleHookDef = {
  name: string;
  outputs: NodeDefPin[];
};

/** Declared in blueprint.config.json: base class name and lifecycle hooks (event graph entries in the editor). */
export type BaseClassDef = {
  name: string;
  lifecycle: LifecycleHookDef[];
};

/**
 * Cross-blueprint global event channel (manifest in blueprint.config.json).
 * Host may extend with more fields later; unknown keys are ignored by the extension.
 */
export type GlobalEventChannelDef = {
  id: string;
  payload: NodeDefPin[];
};

// ─── Editor Webview → Extension Host ────────────────────────────────────────

export type EditorToHostMessage =
  | { type: "ready" }
  | { type: "update"; content: string }
  | { type: "requestSetting" }
  | { type: "build" }
  /** Forward webview `console.*` to extension Output panel. */
  | { type: "webviewLog"; level: "log" | "info" | "warn" | "error" | "debug"; message: string };

// ─── Extension Host → Editor Webview ────────────────────────────────────────

export type HostToEditorMessage =
  | {
      type: "init";
      content: string;
      filePath: string;
      workdir: string;
      extensionVersion: string;
      nodeDefs: NodeDef[];
      baseClasses: BaseClassDef[];
      globalEventChannels: GlobalEventChannelDef[];
      globalEventEmitTemplate: string;
      globalEventListenTemplate: string;
      checkExpr: boolean;
      language: "zh" | "en";
      nodeLayout: NodeLayout;
      theme: "dark" | "light";
      allFiles: string[];
    }
  | { type: "fileChanged"; content: string }
  | {
      type: "settingLoaded";
      nodeDefs: NodeDef[];
      baseClasses: BaseClassDef[];
      globalEventChannels: GlobalEventChannelDef[];
      globalEventEmitTemplate: string;
      globalEventListenTemplate: string;
    }
  | {
      type: "buildResult";
      success: boolean;
      message: string;
      builtCount: number;
      errorCount: number;
      issues: Array<{
        file: string;
        message: string;
        level: "error" | "warning";
        nodeId?: string;
        nodeIds?: string[];
        edgeId?: string;
      }>;
    };
