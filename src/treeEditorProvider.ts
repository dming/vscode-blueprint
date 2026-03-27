import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { runBuild } from "./build/runBuild";
import { getBlueprintOutputChannel } from "./outputChannel";
import type { EditorToHostMessage, HostToEditorMessage, NodeDef, NodeDefPin } from "./types";

/**
 * Read the Vite-generated HTML for the editor webview entry,
 * and rewrite all asset references to proper vscode-webview-resource: URIs.
 */
function buildWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  title?: string
): string {
  const htmlPath = vscode.Uri.joinPath(extensionUri, "dist", "webview", "editor", "index.html");
  let html = fs.readFileSync(htmlPath.fsPath, "utf-8");

  const webviewRootUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webview"));

  const assetsUri = `${webviewRootUri}/assets`;
  html = html.replace(/\.\.\/assets\//g, `${assetsUri}/`);
  html = html.replace(/(?<!=")\.\/assets\//g, `${assetsUri}/`);

  if (title) {
    html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
  }

  const baseTag = `<base href="${webviewRootUri}/">`;

  const src = webview.cspSource;
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${src} data: blob:; style-src ${src} 'unsafe-inline'; script-src ${src} 'unsafe-inline'; font-src ${src} data:; worker-src blob:; connect-src ${src};">`;
  html = html.replace("</head>", `  ${baseTag}\n  ${csp}\n</head>`);

  return html;
}

function getWorkdir(documentUri: vscode.Uri): vscode.Uri {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
  if (workspaceFolder) {
    return workspaceFolder.uri;
  }
  return vscode.Uri.file(path.dirname(documentUri.fsPath));
}

function parsePinEntry(raw: unknown): NodeDefPin | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.includes(":")) {
      const [n, t] = trimmed.split(":");
      const name = (n ?? "").trim();
      const type = (t ?? "").trim();
      if (!name || !type) return null;
      return { name, type };
    }
    return { name: trimmed, type: trimmed === "exec" ? "exec" : "string" };
  }
  if (
    raw &&
    typeof raw === "object" &&
    typeof (raw as { name?: unknown }).name === "string" &&
    typeof (raw as { type?: unknown }).type === "string"
  ) {
    return {
      name: (raw as { name: string }).name.trim(),
      type: (raw as { type: string }).type.trim(),
    };
  }
  return null;
}

function normalizeNodeDef(raw: unknown): NodeDef | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.name !== "string" || !obj.name.trim()) {
    return null;
  }
  const inputs = Array.isArray(obj.inputs)
    ? obj.inputs.map(parsePinEntry).filter((v): v is NodeDefPin => !!v)
    : undefined;
  const outputs = Array.isArray(obj.outputs)
    ? obj.outputs.map(parsePinEntry).filter((v): v is NodeDefPin => !!v)
    : undefined;
  return {
    name: obj.name.trim(),
    title: typeof obj.title === "string" ? obj.title : undefined,
    category: typeof obj.category === "string" ? obj.category : undefined,
    type: typeof obj.type === "string" ? obj.type : undefined,
    desc: typeof obj.desc === "string" ? obj.desc : undefined,
    icon: typeof obj.icon === "string" ? obj.icon : undefined,
    inputs,
    outputs,
    defaults:
      obj.defaults && typeof obj.defaults === "object"
        ? (obj.defaults as Record<string, string | number | boolean>)
        : undefined,
  };
}

async function resolveBlueprintConfigUri(workdirUri: vscode.Uri, documentUri: vscode.Uri): Promise<vscode.Uri | null> {
  const bpConfig = vscode.workspace.getConfiguration("blueprint");
  const configured = bpConfig.get<string>("nodeDefFile", "").trim();
  if (configured) {
    const direct = path.isAbsolute(configured)
      ? vscode.Uri.file(configured)
      : vscode.Uri.file(path.join(workdirUri.fsPath, configured));
    try {
      await vscode.workspace.fs.stat(direct);
      return direct;
    } catch {
      // fallthrough to discovery
    }
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri)?.uri ?? workdirUri;
  let cur = path.dirname(documentUri.fsPath);
  const root = workspaceFolder.fsPath;
  while (true) {
    const candidate = vscode.Uri.file(path.join(cur, "blueprint.config.json"));
    try {
      await vscode.workspace.fs.stat(candidate);
      return candidate;
    } catch {
      // keep walking
    }
    if (path.resolve(cur) === path.resolve(root)) {
      break;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  const rootCandidate = vscode.Uri.file(path.join(workdirUri.fsPath, "blueprint.config.json"));
  try {
    await vscode.workspace.fs.stat(rootCandidate);
    return rootCandidate;
  } catch {
    return null;
  }
}

async function loadNodeDefs(workdirUri: vscode.Uri, documentUri: vscode.Uri): Promise<NodeDef[]> {
  const cfgUri = await resolveBlueprintConfigUri(workdirUri, documentUri);
  if (!cfgUri) return [];
  try {
    const text = Buffer.from(await vscode.workspace.fs.readFile(cfgUri)).toString("utf-8");
    const parsed = JSON.parse(text) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : (parsed as { nodeDefs?: unknown[] })?.nodeDefs && Array.isArray((parsed as { nodeDefs?: unknown[] }).nodeDefs)
        ? (parsed as { nodeDefs: unknown[] }).nodeDefs
        : [];
    return list.map(normalizeNodeDef).filter((v): v is NodeDef => !!v);
  } catch (e) {
    getBlueprintOutputChannel().warn(`Failed to load blueprint.config.json: ${String(e)}`);
    return [];
  }
}

export class TreeEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "blueprint.editor";

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const workdirUri = getWorkdir(document.uri);

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "dist", "webview"),
        workdirUri,
      ],
    };

    webviewPanel.webview.html = this._getEditorHtml(webviewPanel.webview);

    let cachedNodeDefs = await loadNodeDefs(workdirUri, document.uri);
    const settingWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workdirUri, "**/blueprint.config.json")
    );
    const notifySetting = async () => {
      cachedNodeDefs = await loadNodeDefs(workdirUri, document.uri);
      const msg: HostToEditorMessage = { type: "settingLoaded", nodeDefs: cachedNodeDefs };
      webviewPanel.webview.postMessage(msg);
    };
    settingWatcher.onDidCreate(notifySetting);
    settingWatcher.onDidChange(notifySetting);
    settingWatcher.onDidDelete(notifySetting);

    // Main document → webview
    const docChangeDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        if (e.contentChanges.length > 0) {
          const msg: HostToEditorMessage = {
            type: "fileChanged",
            content: document.getText(),
          };
          webviewPanel.webview.postMessage(msg);
        }
      }
    });

    // Handle messages from the editor webview
    webviewPanel.webview.onDidReceiveMessage(async (msg: EditorToHostMessage) => {
      switch (msg.type) {
        case "ready": {
          const theme = getVSCodeTheme();
          const content = document.getText();
          const allFiles = await collectAllBlueprintFiles(workdirUri);

          const initMsg: HostToEditorMessage = {
            type: "init",
            content,
            filePath: document.uri.fsPath,
            workdir: workdirUri.fsPath,
            extensionVersion: String(this._context.extension.packageJSON.version ?? ""),
            nodeDefs: cachedNodeDefs,
            checkExpr: false,
            language: "en",
            nodeLayout: "normal",
            theme,
            allFiles,
          };
          webviewPanel.webview.postMessage(initMsg);
          break;
        }

        case "update": {
          const edit = new vscode.WorkspaceEdit();
          edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), msg.content);
          await vscode.workspace.applyEdit(edit);
          break;
        }

        case "requestSetting": {
          await notifySetting();
          break;
        }

        case "build": {
          const summary = await runBuild(this._context, document.uri);
          const resultMsg: HostToEditorMessage = {
            type: "buildResult",
            success: summary.success,
            message: summary.message,
            builtCount: summary.builtCount,
            errorCount: summary.errorCount,
            issues: summary.issues,
          };
          webviewPanel.webview.postMessage(resultMsg);
          break;
        }

        case "webviewLog": {
          const out = getBlueprintOutputChannel();
          const text = msg.message;
          switch (msg.level) {
            case "log":
              out.info(text);
              break;
            case "info":
              out.info(text);
              break;
            case "debug":
              out.debug(text);
              break;
            case "warn":
              out.warn(text);
              break;
            case "error":
              out.error(text);
              break;
            default:
              out.info(text);
          }
          break;
        }
      }
    });

    webviewPanel.onDidDispose(() => {
      docChangeDisposable.dispose();
      settingWatcher.dispose();
    });
  }

  private _getEditorHtml(webview: vscode.Webview): string {
    return buildWebviewHtml(webview, this._extensionUri, "Blueprint Editor");
  }
}

async function collectAllBlueprintFiles(workdir: vscode.Uri): Promise<string[]> {
  const allFiles: string[] = [];
  try {
    const uris = await vscode.workspace.findFiles(
      new vscode.RelativePattern(workdir, "**/*.bp.json"),
      "**/node_modules/**"
    );
    for (const uri of uris) {
      allFiles.push(path.relative(workdir.fsPath, uri.fsPath).replace(/\\/g, "/"));
    }
    allFiles.sort();
  } catch {
    // workspace may not be open
  }
  return allFiles;
}

function getVSCodeTheme(): "dark" | "light" {
  const kind = vscode.window.activeColorTheme.kind;
  return kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight
    ? "light"
    : "dark";
}
