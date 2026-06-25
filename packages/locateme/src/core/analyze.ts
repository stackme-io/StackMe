// Core analyzer - browser-safe (ts-morph with an in-memory file system, no disk).
// Takes file texts in, returns ReportData. Used by both the CLI and the hub UI.

import { Project, SyntaxKind, Node } from "ts-morph";
import type { ReportData, Finding, Kind, SourceFileInput } from "./types.js";
import { classify } from "./classify.js";

const VERSION = "0.0.1";

const LOCATOR_METHODS = new Set([
  "locator", "getByRole", "getByText", "getByTestId",
  "getByLabel", "getByPlaceholder", "getByTitle", "getByAltText",
]);

function getLiteralSelector(arg: Node | undefined): string | null {
  if (!arg) return null;
  if (Node.isStringLiteral(arg) || Node.isNoSubstitutionTemplateLiteral(arg)) {
    return arg.getLiteralValue();
  }
  return null;
}

function buildSnippet(lines: string[], ln: number): string {
  const from = Math.max(1, ln - 1);
  const to = Math.min(lines.length, ln + 1);
  const out: string[] = [];
  for (let n = from; n <= to; n++) {
    out.push(`${n === ln ? "›" : " "} ${String(n).padStart(4)}  ${lines[n - 1] ?? ""}`);
  }
  return out.join("\n");
}

export function analyze(files: SourceFileInput[], target = ""): ReportData {
  const project = new Project({ useInMemoryFileSystem: true });
  const findings: Finding[] = [];

  for (const f of files) {
    const sf = project.createSourceFile(f.path, f.text, { overwrite: true });
    const lines = f.text.split(/\r?\n/);

    sf.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const call = node.asKindOrThrow(SyntaxKind.CallExpression);
      const expr = call.getExpression();
      if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) return;
      const method = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName();
      if (!LOCATOR_METHODS.has(method)) return;

      const selector = getLiteralSelector(call.getArguments()[0]);
      const line = call.getStartLineNumber();
      const { kind, reason } = classify(method, selector);
      const snippet = kind === "fragile" ? buildSnippet(lines, line) : undefined;
      findings.push({ file: f.path, line, method, selector, kind, reason, snippet });
    });
  }

  const byKind: Record<Kind, number> = { fragile: 0, stable: 0, context: 0, dynamic: 0 };
  for (const f of findings) byKind[f.kind]++;
  const dynamic = byKind.dynamic;
  const classified = findings.length - dynamic;

  return {
    tool: "locateme",
    version: VERSION,
    scannedAt: new Date().toISOString(),
    target,
    summary: {
      files: files.length,
      locatorCalls: findings.length,
      byKind,
      coverage: { total: findings.length, classified, dynamic },
    },
    findings,
  };
}
