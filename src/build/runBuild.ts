import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { getBlueprintOutputChannel } from "../outputChannel";
import { TreeEditorProvider } from "../treeEditorProvider";
import { type BlueprintDocument, type BuildIssue, validateBlueprintDocument } from "./validateBlueprintDocument";

const WORKSPACE_STATE_KEY_PREFIX = "blueprint.lastBuildOutputDir:";
let buildInFlight = false;

function getWorkspaceStateKey(folderUri: vscode.Uri): string {
  return WORKSPACE_STATE_KEY_PREFIX + folderUri.toString();
}

export function getLastBuildOutputUri(
  context: vscode.ExtensionContext,
  workspaceFolder: vscode.Uri
): vscode.Uri | undefined {
  const saved = context.workspaceState.get<string>(getWorkspaceStateKey(workspaceFolder));
  if (!saved) {
    return undefined;
  }
  try {
    const uri = vscode.Uri.file(saved);
    if (fs.existsSync(uri.fsPath)) {
      return uri;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export async function saveLastBuildOutput(
  context: vscode.ExtensionContext,
  workspaceFolder: vscode.Uri,
  outputDirFsPath: string
): Promise<void> {
  await context.workspaceState.update(getWorkspaceStateKey(workspaceFolder), outputDirFsPath);
}

/** Prefer the active blueprint tab (custom editor or .bp.json). */
function getActiveBlueprintFileUri(): vscode.Uri | undefined {
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
  if (tab?.input instanceof vscode.TabInputCustom) {
    if (tab.input.viewType === TreeEditorProvider.viewType && tab.input.uri.scheme === "file") {
      return tab.input.uri;
    }
  }
  if (tab?.input instanceof vscode.TabInputText) {
    const u = tab.input.uri;
    if (u.scheme === "file") {
      const ext = path.extname(u.fsPath).toLowerCase();
      if (u.fsPath.toLowerCase().endsWith(".bp.json") || ext === ".json") {
        return u;
      }
    }
  }
  const ed = vscode.window.activeTextEditor;
  if (ed?.document.uri.scheme === "file") {
    const u = ed.document.uri;
    const ext = path.extname(u.fsPath).toLowerCase();
    if (u.fsPath.toLowerCase().endsWith(".bp.json") || ext === ".json") {
      return u;
    }
  }
  return undefined;
}

export type BuildSummary = {
  success: boolean;
  message: string;
  builtCount: number;
  errorCount: number;
  issues: BuildIssue[];
};

export async function runBuild(
  context: vscode.ExtensionContext,
  explicitTargetUri?: vscode.Uri
): Promise<BuildSummary> {
  if (buildInFlight) {
    void vscode.window.showWarningMessage("A build is already running. Please wait for it to finish.");
    return {
      success: false,
      message: "Build is already running.",
      builtCount: 0,
      errorCount: 1,
      issues: [],
    };
  }
  buildInFlight = true;
  try {
    const bpUri = explicitTargetUri ?? getActiveBlueprintFileUri();
    let folder: vscode.WorkspaceFolder | undefined;
    if (bpUri) {
      folder = vscode.workspace.getWorkspaceFolder(bpUri);
      if (!folder) {
        void vscode.window.showErrorMessage(
          "The active blueprint file must belong to an opened workspace folder."
        );
        return {
          success: false,
          message: "Active blueprint file is outside current workspace.",
          builtCount: 0,
          errorCount: 1,
          issues: [],
        };
      }
    } else {
      folder = vscode.workspace.workspaceFolders?.[0];
    }
    if (!folder) {
      void vscode.window.showErrorMessage("Open a workspace folder before building.");
      return {
        success: false,
        message: "No workspace folder is open.",
        builtCount: 0,
        errorCount: 1,
        issues: [],
      };
    }

    const workspaceRoot = folder.uri.fsPath;

    const defaultUri = getLastBuildOutputUri(context, folder.uri) ?? folder.uri;

    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri,
      openLabel: "Select output folder",
      title: "Build Blueprint - output directory",
    });
    if (!picked || picked.length === 0) {
      return {
        success: false,
        message: "Build cancelled: no output directory selected.",
        builtCount: 0,
        errorCount: 0,
        issues: [],
      };
    }

    const outputDirFs = picked[0].fsPath;
    await saveLastBuildOutput(context, folder.uri, outputDirFs);

    const out = getBlueprintOutputChannel();
    out.show(true);
    out.info(`Blueprint build output -> ${outputDirFs}`);

    const targets: vscode.Uri[] = [];
    if (bpUri) {
      targets.push(bpUri);
    } else {
      const uris = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder.uri, "**/*.bp.json"),
        "**/node_modules/**"
      );
      targets.push(...uris);
    }
    if (targets.length === 0) {
      void vscode.window.showWarningMessage("No .bp.json blueprint files found in workspace.");
      return {
        success: false,
        message: "No .bp.json files found.",
        builtCount: 0,
        errorCount: 0,
        issues: [],
      };
    }

    let errorCount = 0;
    let builtCount = 0;
    const issues: BuildIssue[] = [];
    for (const uri of targets) {
      try {
        const raw = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf-8");
        const doc = JSON.parse(raw) as BlueprintDocument;
        const rel = path.relative(workspaceRoot, uri.fsPath).replace(/\\/g, "/");
        const validationIssues = validateBlueprintDocument(doc, rel);
        if (validationIssues.length > 0) {
          for (const issue of validationIssues) {
            issues.push(issue);
            if (issue.level === "warning") {
              out.warn(`[${issue.file}] ${issue.message}`);
            } else {
              out.error(`[${issue.file}] ${issue.message}`);
            }
          }
          const fileErrorCount = validationIssues.filter((v) => v.level === "error").length;
          if (fileErrorCount > 0) {
            throw new Error(`Validation failed (${fileErrorCount} error(s))`);
          }
        }
        const outFile = path.join(outputDirFs, rel.replace(/\.bp\.json$/i, ".compiled.json"));
        await fs.promises.mkdir(path.dirname(outFile), { recursive: true });
        await fs.promises.writeFile(outFile, JSON.stringify(doc, null, 2), "utf-8");
        out.info(`Built: ${rel}`);
        builtCount += 1;
      } catch (e) {
        out.error(`Build failed for ${uri.fsPath}: ${e instanceof Error ? e.message : String(e)}`);
        errorCount += 1;
      }
    }

    const warningCount = issues.filter((i) => i.level === "warning").length;
    if (errorCount > 0) {
      const message = `Blueprint build completed with ${errorCount} error(s). Built ${builtCount} file(s).`;
      void vscode.window.showErrorMessage(
        message
      );
      return {
        success: false,
        message,
        builtCount,
        errorCount,
        issues,
      };
    } else {
      out.info(`Build completed: ${builtCount} file(s)`);
      const message =
        warningCount > 0
          ? `Blueprint build completed with ${warningCount} warning(s): ${builtCount} file(s).`
          : `Blueprint build completed: ${builtCount} file(s).`;
      if (warningCount > 0) {
        void vscode.window.showWarningMessage(message);
      } else {
        void vscode.window.showInformationMessage(message);
      }
      return {
        success: true,
        message,
        builtCount,
        errorCount: 0,
        issues,
      };
    }
  } finally {
    buildInFlight = false;
  }
}
