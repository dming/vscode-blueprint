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
      checkExpr: boolean;
      language: "zh" | "en";
      nodeLayout: NodeLayout;
      theme: "dark" | "light";
      allFiles: string[];
    }
  | { type: "fileChanged"; content: string }
  | { type: "settingLoaded"; nodeDefs: NodeDef[] }
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
