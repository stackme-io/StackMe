// Core analyzer - browser-safe. Parser-agnostic: it asks an extractor for the raw
// locator calls in each file, then runs classify() over them and assembles ReportData.
// The extractor is chosen by file extension, so a Java (tree-sitter) front-end plugs
// in here without touching classification or the report shape. Used by CLI and hub UI.

import type { ReportData, Finding, Kind, SourceFileInput, LocatorExtractor } from "./types.js";
import { classify } from "./classify.js";
import { TsMorphExtractor } from "./extractTsMorph.js";

const VERSION = "0.0.1";

const tsMorph = new TsMorphExtractor();
const emptyExtractor: LocatorExtractor = { extract: () => ({ locators: [], errors: [] }) };

// The Java (tree-sitter) extractor lives in the app (it owns the wasm init), so it
// registers itself here. Until it does, .java files yield nothing rather than being
// fed to ts-morph (which would misparse them).
let javaExtractor: LocatorExtractor | null = null;
export function registerJavaExtractor(extractor: LocatorExtractor): void {
  javaExtractor = extractor;
}

// Single dispatch point: pick the front-end by file extension.
function extractorFor(path: string): LocatorExtractor {
  if (/\.java$/i.test(path)) return javaExtractor ?? emptyExtractor;
  return tsMorph;
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
  const findings: Finding[] = [];
  let unparsed = 0;

  for (const f of files) {
    const lines = f.text.split(/\r?\n/);
    const { locators, errors } = extractorFor(f.path).extract(f);
    unparsed += errors.length;
    for (const r of locators) {
      const { kind, reason, subcause, confidence, prefer } = classify(r.method, r.selector);
      const snippet = kind === "fragile" ? buildSnippet(lines, r.line) : undefined;
      findings.push({
        file: f.path,
        line: r.line,
        method: r.method,
        selector: r.selector,
        kind, reason, subcause, confidence, prefer, snippet,
      });
    }
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
      ...(unparsed > 0 ? { unparsed } : {}),
    },
    findings,
  };
}
