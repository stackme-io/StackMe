// LocateMe CLI — thin wrapper around the browser-safe core.
// Reads .ts files from disk, feeds their text to core.analyze, prints + writes JSON/HTML.
//
// Run:    npm start                       (scans the bundled fixture)
//         npx tsx src/index.ts <folder> [--share]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyze } from "./core/analyze.js";
import type { SourceFileInput } from "./core/types.js";
import { renderHtml } from "./report.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Recursively collect .ts files (skip node_modules / dist), read their text.
function collectTsFiles(dir: string): SourceFileInput[] {
  const entries = fs.readdirSync(dir, { recursive: true, encoding: "utf8" }) as string[];
  const files: SourceFileInput[] = [];
  for (const raw of entries) {
    const rel = raw.replace(/\\/g, "/");
    if (!rel.endsWith(".ts")) continue;
    if (rel.includes("node_modules/") || rel.includes("dist/")) continue;
    const abs = path.join(dir, raw);
    try {
      if (!fs.statSync(abs).isFile()) continue;
      files.push({ path: rel, text: fs.readFileSync(abs, "utf8") });
    } catch {
      /* unreadable entry — skip */
    }
  }
  return files;
}

function main(): void {
  const args = process.argv.slice(2);
  const share = args.includes("--share");
  const inputArg = args.find((a) => !a.startsWith("--"));
  const targetDir = inputArg ? path.resolve(inputArg) : path.resolve(__dirname, "../fixtures/sample");

  if (!fs.existsSync(targetDir)) {
    console.error(`path not found: ${targetDir}`);
    process.exit(1);
  }

  const files = collectTsFiles(targetDir);
  if (files.length === 0) {
    console.log(`scanned ${targetDir}`);
    console.log("no .ts files found — point me at a folder with TypeScript tests.");
    return;
  }

  const report = analyze(files, targetDir);

  if (report.findings.length === 0) {
    console.log(`scanned ${report.summary.files} .ts file(s) in ${targetDir}`);
    console.log("found 0 Playwright locators — this doesn't look like a Playwright/TS test suite (or wrong folder).");
    console.log("(not a verdict — there is simply nothing to analyze here)");
    return;
  }

  const k = report.summary.byKind;
  console.log(`scanned ${report.summary.files} .ts file(s) in ${targetDir}`);
  console.log(`locator calls: ${report.summary.locatorCalls}`);
  console.log("by kind:");
  for (const kind of ["fragile", "stable", "context", "dynamic"] as const) {
    console.log(`  ${kind.padEnd(10)} ${k[kind]}`);
  }
  const cov = report.summary.coverage;
  console.log(`coverage: ${cov.total} calls (classified ${cov.classified}, dynamic ${cov.dynamic})`);

  // hot files
  const perFile = new Map<string, { fragile: number; total: number }>();
  for (const f of report.findings) {
    const e = perFile.get(f.file) ?? { fragile: 0, total: 0 };
    e.total++;
    if (f.kind === "fragile") e.fragile++;
    perFile.set(f.file, e);
  }
  const hot = [...perFile.entries()].filter(([, e]) => e.fragile > 0).sort((a, b) => b[1].fragile - a[1].fragile).slice(0, 10);
  console.log(`\nhot files (by fragile):`);
  if (!hot.length) console.log("  none — no fragile locators");
  for (const [file, e] of hot) console.log(`  ${file}  ${e.fragile} fragile / ${e.total} locators`);

  // duplicates (skip stable)
  const byKey = new Map<string, typeof report.findings>();
  for (const f of report.findings) {
    if (f.selector === null || f.kind === "stable") continue;
    const key = `${f.method} ${f.selector}`;
    const arr = byKey.get(key);
    if (arr) arr.push(f);
    else byKey.set(key, [f]);
  }
  const dupes = [...byKey.values()].filter((l) => l.length >= 2).sort((a, b) => b.length - a.length).slice(0, 10);
  console.log(`\nduplicates (fragile/context selector in ≥2 places):`);
  if (!dupes.length) console.log("  none");
  for (const list of dupes) {
    const where = list.slice(0, 4).map((f) => `${f.file}:${f.line}`).join(", ");
    const more = list.length > 4 ? `, +${list.length - 4}` : "";
    console.log(`  [${list[0].kind}] ${JSON.stringify(list[0].selector)} ×${list.length}  (${where}${more})`);
  }

  // fragile list
  const fragile = report.findings.filter((f) => f.kind === "fragile");
  console.log(`\nfragile locators (${fragile.length}):`);
  for (const f of fragile.slice(0, 40)) {
    console.log(`  ${f.file}:${f.line}  ${f.method}(${JSON.stringify(f.selector)})`);
  }
  if (fragile.length > 40) console.log(`  ...and ${fragile.length - 40} more`);

  const jsonOut = path.join(process.cwd(), "locateme-report.json");
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2), "utf8");
  console.log(`\njson written:  ${jsonOut}`);

  const htmlOut = path.join(process.cwd(), "locateme-report.html");
  fs.writeFileSync(htmlOut, renderHtml(report, { share }), "utf8");
  console.log(`html written:  ${htmlOut}${share ? "  (share mode: paths masked, no snippets)" : ""}`);
}

main();
