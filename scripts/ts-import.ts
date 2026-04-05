/**
 * Enforce physical import boundaries between top-level folders under src/.
 * Run: npm run check:ts-imports
 */
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

const REPO_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(REPO_ROOT, "src");

/** First path segment under src/ for layered dirs (no `src/*.ts` barrels — those are forbidden targets). */
type Layer = "shared" | "host" | "webview" | "runtime";

/**
 * Each layer may only import project-local modules that live in these layers
 * (plus same-folder relative imports, which map to the same layer).
 */
const ALLOWED_TARGETS: Record<Layer, ReadonlySet<Layer>> = {
  shared: new Set(["shared"]),
  host: new Set(["host", "shared"]),
  webview: new Set(["webview", "shared"]),
  runtime: new Set(["runtime", "shared"]),
};

const LAYER_DIRS = new Set<string>(["shared", "host", "webview", "runtime"]);

function getSourceLayer(absFile: string): Layer | null {
  const rel = path.relative(SRC_ROOT, absFile);
  if (rel.startsWith("..") || rel === "") return null;
  const norm = rel.split(path.sep).join("/");
  const seg = norm.split("/")[0];
  if (!seg || seg.includes(".")) return null;
  if (LAYER_DIRS.has(seg)) return seg as Layer;
  return null;
}

/** True for `src/foo.ts` / `src/foo.tsx` (must not be imported from layered code). */
function isSrcRootTsModule(absResolved: string): boolean {
  const rel = path.relative(SRC_ROOT, absResolved);
  if (rel.startsWith("..") || rel === "") return false;
  const norm = rel.split(path.sep).join("/");
  if (norm.includes("/")) return false;
  return norm.endsWith(".ts") || norm.endsWith(".tsx");
}

function getTargetLayer(absResolved: string): Layer | null {
  const rel = path.relative(SRC_ROOT, absResolved);
  if (rel.startsWith("..") || rel === "") return null;
  const norm = rel.split(path.sep).join("/");
  const first = norm.split("/")[0];
  if (first.includes(".")) return null;
  if (LAYER_DIRS.has(first)) return first as Layer;
  return null;
}

function collectSpecifiers(sourceFile: ts.SourceFile): Array<{ spec: string; line: number }> {
  const out: Array<{ spec: string; line: number }> = [];

  function lineOf(node: ts.Node): number {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  }

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      out.push({ spec: node.moduleSpecifier.text, line: lineOf(node.moduleSpecifier) });
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      out.push({ spec: node.moduleSpecifier.text, line: lineOf(node.moduleSpecifier) });
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      out.push({ spec: node.moduleReference.expression.text, line: lineOf(node.moduleReference.expression) });
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg0 = node.arguments[0];
      if (arg0 && ts.isStringLiteralLike(arg0)) {
        out.push({ spec: arg0.text, line: lineOf(arg0) });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return out;
}

function resolveProjectFile(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;

  const base = path.resolve(path.dirname(fromFile), specifier);
  return resolveModulePath(base);
}

function resolveModulePath(baseWithoutExt: string): string | null {
  const candidates = [
    baseWithoutExt,
    baseWithoutExt + ".ts",
    baseWithoutExt + ".tsx",
    path.join(baseWithoutExt, "index.ts"),
    path.join(baseWithoutExt, "index.tsx"),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return path.normalize(c);
    } catch {
      /* ignore */
    }
  }
  return null;
}

function walkTsFiles(dir: string, acc: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkTsFiles(full, acc);
    else if (e.isFile() && (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) && !e.name.endsWith(".d.ts")) {
      acc.push(full);
    }
  }
}

function main(): void {
  const files: string[] = [];
  walkTsFiles(SRC_ROOT, files);

  const errors: string[] = [];

  for (const absFile of files) {
    const sourceLayer = getSourceLayer(absFile);
    if (!sourceLayer) continue;

    const allowed = ALLOWED_TARGETS[sourceLayer];
    const text = fs.readFileSync(absFile, "utf8");
    const sf = ts.createSourceFile(absFile, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    for (const { spec, line } of collectSpecifiers(sf)) {
      const resolved = resolveProjectFile(absFile, spec);
      if (!resolved) continue;

      if (!resolved.startsWith(SRC_ROOT)) continue;

      if (isSrcRootTsModule(resolved)) {
        const relFile = path.relative(REPO_ROOT, absFile).split(path.sep).join("/");
        const relTo = path.relative(REPO_ROOT, resolved).split(path.sep).join("/");
        errors.push(`${relFile}:${line}  cannot import root-level src module "${relTo}" (use a folder under src/ instead)`);
        continue;
      }

      const targetLayer = getTargetLayer(resolved);
      if (!targetLayer) continue;

      if (!allowed.has(targetLayer)) {
        const relFile = path.relative(REPO_ROOT, absFile).split(path.sep).join("/");
        errors.push(
          `${relFile}:${line}  layer "${sourceLayer}" cannot import "${spec}" (resolves to layer "${targetLayer}")`,
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error("ts-import boundary violations:\n");
    for (const e of errors) console.error(e);
    process.exit(1);
  }

  console.log("ts-import: OK (%d files under src/)", files.length);
}

main();
