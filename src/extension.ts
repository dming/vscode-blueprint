import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { composeLoggers, createConsoleLogger, setLogger } from "../webview/shared/misc/logger";
import { runBuild } from "./build/runBuild";
import { createLogOutputChannelLogger } from "./logChannel";
import { getBlueprintOutputChannel } from "./outputChannel";
import { TreeEditorProvider } from "./treeEditorProvider";

function getAutoOpenBlueprintSetting(): boolean {
  return vscode.workspace.getConfiguration("blueprint").get<boolean>("autoOpen", true);
}

function getNodeDefFileSetting(): string {
  return vscode.workspace.getConfiguration("blueprint").get<string>("nodeDefFile", "").trim();
}

export function activate(context: vscode.ExtensionContext) {
  const out = getBlueprintOutputChannel();
  context.subscriptions.push(out);
  setLogger(composeLoggers(createConsoleLogger(), createLogOutputChannelLogger(out)));

  const editorProvider = new TreeEditorProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(TreeEditorProvider.viewType, editorProvider, {
      supportsMultipleEditorsPerDocument: false,
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    })
  );

  // Auto-open blueprint files once per open cycle (re-check after close/reopen).
  const autoCheckedJsonWhileOpen = new Set<string>();
  const autoOpeningJsonUris = new Set<string>();
  const skipNextAutoOpenUris = new Set<string>();
  context.subscriptions.push(
    vscode.window.tabGroups.onDidChangeTabs((event) => {
      const autoOpen = getAutoOpenBlueprintSetting();
      if (!autoOpen) {
        return;
      }
      for (const tab of event.closed) {
        const input = tab.input;
        if (input instanceof vscode.TabInputText) {
          const key = input.uri.toString();
          autoCheckedJsonWhileOpen.delete(key);
          autoOpeningJsonUris.delete(key);
        }
      }
      for (const tab of event.opened) {
        const input = tab.input;
        if (input instanceof vscode.TabInputText) {
          void tryAutoOpenBlueprintEditor(
            input.uri,
            autoCheckedJsonWhileOpen,
            autoOpeningJsonUris,
            skipNextAutoOpenUris
          );
        }
      }
    })
  );

  // Command: build
  context.subscriptions.push(
    vscode.commands.registerCommand("blueprint.build", async () => {
      await runBuild(context);
    })
  );

  /** Switch between the Blueprint webview editor and the built-in text editor for the same file. */
  context.subscriptions.push(
    vscode.commands.registerCommand("blueprint.toggleEditorMode", async () => {
      const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
      if (!tab) {
        return;
      }
      const input = tab.input;
      if (input instanceof vscode.TabInputTextDiff) {
        void vscode.window.showInformationMessage(
          "Cannot switch editor mode while viewing a diff."
        );
        return;
      }
      if (
        input instanceof vscode.TabInputCustom &&
        input.viewType === TreeEditorProvider.viewType
      ) {
        skipNextAutoOpenUris.add(input.uri.toString());
        await vscode.commands.executeCommand("vscode.openWith", input.uri, "default");
        return;
      }
      if (input instanceof vscode.TabInputText) {
        const uri = input.uri;
        if (uri.scheme === "file") {
          const p = uri.fsPath.toLowerCase();
          if (p.endsWith(".bp.json")) {
            await vscode.commands.executeCommand(
              "vscode.openWith",
              uri,
              TreeEditorProvider.viewType
            );
            return;
          }
        }
      }
      void vscode.window.showInformationMessage(
        "Editor mode toggle applies to Blueprint JSON files (*.bp.json)."
      );
    })
  );

  // Command: create a new blueprint project from template
  context.subscriptions.push(
    vscode.commands.registerCommand("blueprint.createProject", async (uri?: vscode.Uri) => {
      const parentUri = uri ?? vscode.workspace.workspaceFolders?.[0]?.uri;
      if (!parentUri || parentUri.scheme !== "file") {
        vscode.window.showErrorMessage("Please open a workspace folder first.");
        return;
      }

      const projectName = await vscode.window.showInputBox({
        prompt: "Enter project folder name",
        placeHolder: "my-blueprint-project",
        validateInput: (v) => (v.trim() ? null : "Name cannot be empty"),
      });
      if (!projectName) {
        return;
      }

      const projectDir = path.join(parentUri.fsPath, projectName.trim());
      if (fs.existsSync(projectDir)) {
        void vscode.window.showErrorMessage(`Folder already exists: ${projectName.trim()}`);
        return;
      }

      try {
        await fs.promises.mkdir(projectDir, { recursive: false });

        await fs.promises.writeFile(
          path.join(projectDir, "blueprint.config.json"),
          JSON.stringify(
            {
              nodeDefs: [
                { name: "Event.Start", category: "Event", outputs: ["exec"] },
                {
                  name: "Print",
                  category: "Debug",
                  inputs: ["exec", "text"],
                  outputs: ["exec"],
                },
              ],
            },
            null,
            2
          ),
          "utf-8"
        );

        await fs.promises.writeFile(
          path.join(projectDir, "main.bp.json"),
          JSON.stringify(
            {
              formatVersion: 1,
              graph: {
                id: "main",
                name: "Main",
                nodes: [
                  {
                    id: "start",
                    title: "Start",
                    x: 120,
                    y: 120,
                    inputs: [],
                    outputs: [{ name: "exec", type: "exec" }],
                  },
                  {
                    id: "print",
                    title: "Print",
                    x: 420,
                    y: 120,
                    inputs: [
                      { name: "exec", type: "exec" },
                      { name: "text", type: "string" },
                    ],
                    outputs: [{ name: "exec", type: "exec" }],
                    values: { text: "Hello Blueprint" },
                  },
                ],
                edges: [
                  {
                    id: "e1",
                    fromNodeId: "start",
                    fromPin: "exec",
                    toNodeId: "print",
                    toPin: "exec",
                  },
                ],
                variables: [],
              },
              metadata: {},
            },
            null,
            2
          ),
          "utf-8"
        );

        await fs.promises.writeFile(
          path.join(projectDir, "blueprint.project.json"),
          JSON.stringify(
            { projectType: "blueprint", entry: "main.bp.json" },
            null,
            2
          ),
          "utf-8"
        );

        const fileUri = vscode.Uri.file(path.join(projectDir, "main.bp.json"));
        await vscode.commands.executeCommand(
          "vscode.openWith",
          fileUri,
          TreeEditorProvider.viewType
        );
      } catch (e) {
        void vscode.window.showErrorMessage(
          `Failed to create project: ${e instanceof Error ? e.message : e}`
        );
        return;
      }
    })
  );

  // Command: open blueprint file with custom editor
  context.subscriptions.push(
    vscode.commands.registerCommand("blueprint.openWithEditor", async (uri?: vscode.Uri) => {
      if (!uri) {
        vscode.window.showErrorMessage("No file selected.");
        return;
      }
      await vscode.commands.executeCommand("vscode.openWith", uri, TreeEditorProvider.viewType);
    })
  );

  // Command: open blueprint config file in current workspace.
  context.subscriptions.push(
    vscode.commands.registerCommand("blueprint.openSettings", async () => {
      const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
      if (!folder) {
        void vscode.window.showInformationMessage("Open a workspace folder first.");
        return;
      }
      const hits = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder.fsPath, "**/blueprint.config.json"),
        null,
        1
      );
      let fsPath = hits[0]?.fsPath;
      const configured = getNodeDefFileSetting();
      if (configured) {
        const candidate = path.isAbsolute(configured)
          ? configured
          : path.join(folder.fsPath, configured);
        if (fs.existsSync(candidate)) {
          fsPath = candidate;
        }
      }
      if (fsPath) {
        await vscode.window.showTextDocument(vscode.Uri.file(fsPath));
      } else {
        void vscode.window.showInformationMessage(
          "No blueprint.config.json found in workspace."
        );
      }
    })
  );
}

export function deactivate() {}

async function tryAutoOpenBlueprintEditor(
  uri: vscode.Uri,
  autoCheckedJsonWhileOpen: Set<string>,
  autoOpeningJsonUris: Set<string>,
  skipNextAutoOpenUris: Set<string>
): Promise<void> {
  if (uri.scheme !== "file") {
    return;
  }
  if (!uri.fsPath.toLowerCase().endsWith(".bp.json")) {
    return;
  }
  const key = uri.toString();
  if (skipNextAutoOpenUris.has(key)) {
    skipNextAutoOpenUris.delete(key);
    return;
  }
  if (autoCheckedJsonWhileOpen.has(key) || autoOpeningJsonUris.has(key)) {
    return;
  }
  autoCheckedJsonWhileOpen.add(key);
  autoOpeningJsonUris.add(key);
  try {
    await closeDuplicateTextTabForUri(uri);
    await vscode.commands.executeCommand("vscode.openWith", uri, TreeEditorProvider.viewType, {
      viewColumn: vscode.ViewColumn.Active,
      preserveFocus: false,
      preview: true,
    });
  } catch {
    // Ignore openWith failures and keep default text editor.
  } finally {
    autoOpeningJsonUris.delete(key);
  }
}

async function closeDuplicateTextTabForUri(uri: vscode.Uri): Promise<void> {
  const tabsToClose: vscode.Tab[] = [];
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const input = tab.input;
      if (input instanceof vscode.TabInputText && input.uri.toString() === uri.toString()) {
        tabsToClose.push(tab);
      }
    }
  }
  if (tabsToClose.length > 0) {
    await vscode.window.tabGroups.close(tabsToClose);
  }
}
