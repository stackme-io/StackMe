// LocateMe — static locator-fragility audit for Playwright/TypeScript test suites.
// Iteration: CLI arg (scan any folder) + honest dirty-input handling + fragile listing.
//
// Run:    npm start                       (scans the bundled fixture)
//         npx tsx src/index.ts <folder>   (scans a real repo)
//
// Output: counts by kind, then the fragile locators (capped). We hunt FALSE POSITIVES.

import { Project, SyntaxKind, Node } from "ts-morph";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { Kind, Finding, ReportData } from "./types.js";
import { renderHtml } from "./report.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOCATOR_METHODS = new Set([
  "locator", "getByRole", "getByText", "getByTestId",
  "getByLabel", "getByPlaceholder", "getByTitle", "getByAltText",
]);

const STABLE_METHODS = new Set(["getByRole", "getByTestId", "getByLabel"]);
const CONTEXT_METHODS = new Set(["getByText", "getByPlaceholder", "getByTitle", "getByAltText"]);

function isXpath(s: string): boolean {
  return s.startsWith("//") || s.startsWith("(//") || s.startsWith(".//") ||
    s.startsWith("(.//") || s.startsWith("xpath=");
}

interface Classification {
  kind: Kind;
  reason: string;
}

// Look INSIDE the xpath — not every xpath is fragile. Positional/structural = fragile,
// but xpath anchored on a stable id/test attribute won't break from layout changes.
function classifyXpath(raw: string): Classification {
  const s = raw.replace(/^xpath=/, "");
  if (/::/.test(s)) return { kind: "fragile", reason: "XPath axis traversal — tied to DOM structure, breaks on markup changes." };
  if (/\[\d+\]/.test(s)) return { kind: "fragile", reason: "Positional index in the path — breaks when order or layout changes." };
  if (/text\(\)|contains\(\s*text/i.test(s)) return { kind: "context", reason: "Text-based xpath — can break on localization/content changes." };
  if (/@(data-testid|data-test|data-cy|data-qa)\b/i.test(s)) return { kind: "stable", reason: "Anchored on a test attribute." };
  if (/@(id|name)\s*=/i.test(s)) return { kind: "stable", reason: "Anchored on a stable id/name attribute." };
  if (/@[\w-]+\s*=/.test(s)) return { kind: "context", reason: "Anchored on an attribute — stability depends on the attribute." };
  return { kind: "fragile", reason: "Structural path with no stable anchor — breaks on any markup change." };
}

function classifyCss(s: string): Classification {
  if (/:nth-(child|of-type)\b/.test(s) || /\bnth=/.test(s) || /\[\d+\]/.test(s))
    return { kind: "fragile", reason: "Positional CSS (:nth-child / index) — breaks when items are added or reordered." };
  if (/(^|[.\s>~+])(css|sc)-[a-z0-9]/i.test(s))
    return { kind: "fragile", reason: "Auto-generated class name (CSS-in-JS) — changes on every build." };
  if (/\[data-(testid|test|cy|qa)\b/i.test(s)) return { kind: "stable", reason: "Test attribute selector." };
  if (/^#[\w-]+$/.test(s)) return { kind: "stable", reason: "Single id selector." };
  return { kind: "context", reason: "Class/attribute selector — stability depends on your project." };
}

function classify(method: string, selector: string | null): Classification {
  if (selector === null) return { kind: "dynamic", reason: "Selector built at runtime (variable/template) — not classified." };
  if (STABLE_METHODS.has(method)) return { kind: "stable", reason: `User-facing locator (${method}) — recommended, resilient.` };
  if (CONTEXT_METHODS.has(method)) return { kind: "context", reason: `Text/label-based locator (${method}) — can break on localization.` };

  const s = selector.trim();
  return isXpath(s) ? classifyXpath(s) : classifyCss(s);
}

function getLiteralSelector(arg: Node | undefined): string | null {
  if (!arg) return null;
  if (Node.isStringLiteral(arg) || Node.isNoSubstitutionTemplateLiteral(arg)) {
    return arg.getLiteralValue();
  }
  return null;
}

// A few source lines around the locator, with the target line marked — so the report
// can show the real code and the reader can verify the tool isn't lying.
function buildSnippet(lines: string[], ln: number): string {
  const from = Math.max(1, ln - 1);
  const to = Math.min(lines.length, ln + 1);
  const out: string[] = [];
  for (let n = from; n <= to; n++) {
    out.push(`${n === ln ? "›" : " "} ${String(n).padStart(4)}  ${lines[n - 1] ?? ""}`);
  }
  return out.join("\n");
}

function collectFindings(project: Project): Finding[] {
  const findings: Finding[] = [];
  for (const sourceFile of project.getSourceFiles()) {
    const file = sourceFile.getFilePath();
    const lines = sourceFile.getFullText().split(/\r?\n/);
    sourceFile.forEachDescendant((node) => {
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
      findings.push({ file, line, method, selector, kind, reason, snippet });
    });
  }
  return findings;
}

function main(): void {
  // CLI: <folder> [--share].  --share = client-report mode (mask paths, no code snippets).
  const args = process.argv.slice(2);
  const share = args.includes("--share");
  const inputArg = args.find((a) => !a.startsWith("--"));
  const targetDir = inputArg ? path.resolve(inputArg) : path.resolve(__dirname, "../fixtures/sample");

  if (!fs.existsSync(targetDir)) {
    console.error(`path not found: ${targetDir}`);
    process.exit(1);
  }

  const glob = path.join(targetDir, "**/*.ts").replace(/\\/g, "/");
  const project = new Project();
  project.addSourceFilesAtPaths([glob, "!**/node_modules/**", "!**/dist/**"]);

  const fileCount = project.getSourceFiles().length;
  if (fileCount === 0) {
    console.log(`scanned ${targetDir}`);
    console.log("no .ts files found — point me at a folder with TypeScript tests.");
    return;
  }

  const findings = collectFindings(project);
  if (findings.length === 0) {
    console.log(`scanned ${fileCount} .ts file(s) in ${targetDir}`);
    console.log("found 0 Playwright locators — this doesn't look like a Playwright/TS test suite (or wrong folder).");
    console.log("(not a verdict — there is simply nothing to analyze here)");
    return;
  }

  const rel = (abs: string) => path.relative(targetDir, abs).replace(/\\/g, "/");

  const byKind = new Map<Kind, number>();
  for (const f of findings) byKind.set(f.kind, (byKind.get(f.kind) ?? 0) + 1);
  const dynamicCount = byKind.get("dynamic") ?? 0;
  const classified = findings.length - dynamicCount;

  console.log(`scanned ${fileCount} .ts file(s) in ${targetDir}`);
  console.log(`locator calls: ${findings.length}`);
  console.log("by kind:");
  for (const kind of ["fragile", "stable", "context", "dynamic"] as Kind[]) {
    console.log(`  ${kind.padEnd(10)} ${byKind.get(kind) ?? 0}`);
  }
  // 1.9 coverage — be honest about the blind spot (dynamic = not classified).
  console.log(`coverage: ${findings.length} calls (classified ${classified}, dynamic ${dynamicCount})`);

  // 1.7 hot files — fragile count per file.
  const perFile = new Map<string, { fragile: number; total: number }>();
  for (const f of findings) {
    const r = rel(f.file);
    const e = perFile.get(r) ?? { fragile: 0, total: 0 };
    e.total++;
    if (f.kind === "fragile") e.fragile++;
    perFile.set(r, e);
  }
  const hot = [...perFile.entries()]
    .filter(([, e]) => e.fragile > 0)
    .sort((a, b) => b[1].fragile - a[1].fragile)
    .slice(0, 10);
  console.log(`\nhot files (by fragile):`);
  if (hot.length === 0) console.log("  none — no fragile locators");
  for (const [file, e] of hot) console.log(`  ${file}  ${e.fragile} fragile / ${e.total} locators`);

  // 1.10 duplicates — same literal selector copied in ≥2 places.
  // Skip STABLE selectors: reusing a stable testid/role across tests is the recommended
  // pattern, not a smell. We care about duplicated fragile/context selectors ("fix one, close N").
  const byKey = new Map<string, Finding[]>();
  for (const f of findings) {
    if (f.selector === null || f.kind === "stable") continue;
    const key = `${f.method} ${f.selector}`;
    const arr = byKey.get(key);
    if (arr) arr.push(f);
    else byKey.set(key, [f]);
  }
  const dupes = [...byKey.values()]
    .filter((list) => list.length >= 2)
    .sort((a, b) => b.length - a.length)
    .slice(0, 10);
  console.log(`\nduplicates (fragile/context selector in ≥2 places):`);
  if (dupes.length === 0) console.log("  none");
  for (const list of dupes) {
    const where = list.slice(0, 4).map((f) => `${rel(f.file)}:${f.line}`).join(", ");
    const more = list.length > 4 ? `, +${list.length - 4}` : "";
    console.log(`  [${list[0].kind}] ${JSON.stringify(list[0].selector)} ×${list.length}  (${where}${more})`);
  }

  // List fragile (what we act on AND eyeball for false positives).
  const fragile = findings.filter((f) => f.kind === "fragile");
  const SHOW = 40;
  console.log(`\nfragile locators (${fragile.length}):`);
  for (const f of fragile.slice(0, SHOW)) {
    console.log(`  ${rel(f.file)}:${f.line}  ${f.method}(${JSON.stringify(f.selector)})`);
  }
  if (fragile.length > SHOW) console.log(`  ...and ${fragile.length - SHOW} more`);

  // 1.11 JSON contract — the format the HTML report and the future delta read from.
  const report: ReportData = {
    tool: "locateme",
    version: "0.0.1",
    scannedAt: new Date().toISOString(),
    target: targetDir,
    summary: {
      files: fileCount,
      locatorCalls: findings.length,
      byKind: {
        fragile: byKind.get("fragile") ?? 0,
        stable: byKind.get("stable") ?? 0,
        context: byKind.get("context") ?? 0,
        dynamic: byKind.get("dynamic") ?? 0,
      },
      coverage: { total: findings.length, classified, dynamic: dynamicCount },
    },
    findings: findings.map((f) => ({ file: rel(f.file), line: f.line, method: f.method, selector: f.selector, kind: f.kind, reason: f.reason, snippet: f.snippet })),
  };

  const jsonOut = path.join(process.cwd(), "locateme-report.json");
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2), "utf8");
  console.log(`\njson written:  ${jsonOut}`);

  // Phase 2 — first visual: single-file HTML report.
  const htmlOut = path.join(process.cwd(), "locateme-report.html");
  fs.writeFileSync(htmlOut, renderHtml(report, { share }), "utf8");
  console.log(`html written:  ${htmlOut}${share ? "  (share mode: paths masked, no snippets)" : ""}`);
}

main();
