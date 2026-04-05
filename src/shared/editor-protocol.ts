/**
 * Message types between VS Code extension host and the blueprint editor webview.
 */

import type { BaseClassDef, GlobalEventChannelDef, NodeDef } from "./blueprint-config";

export type NodeLayout = "normal" | "compact";

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
