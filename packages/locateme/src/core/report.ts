// Renders a self-contained single-file HTML report from ReportData.
// Everything is inline (CSS + data) so the file can be saved and forwarded as one artifact.
// Browser-safe: pure string building, no fs/Node deps.

import type { ReportData, Finding, Kind } from "./types.js";

// Kind colors match the app design tokens (index.css --k-*).
const KIND_COLOR: Record<Kind, string> = {
  fragile: "#D2603E",
  stable: "#27A982",
  context: "#E2A636",
  dynamic: "#9A9892",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// One-line verdict - PER FINDING, never a project grade/score. Duplicate detail lives
// in the Duplicates card, not in the headline.
function verdict(d: ReportData): string {
  const fragile = d.summary.byKind.fragile;
  if (fragile === 0) return "No fragile locators found (by form). Nothing to harden right now.";
  const hotFiles = new Set(d.findings.filter((f) => f.kind === "fragile").map((f) => f.file)).size;
  return `${fragile} fragile locator${fragile === 1 ? "" : "s"} across ${hotFiles} of ${d.summary.files} files.`;
}

function hotFiles(findings: Finding[]) {
  const per = new Map<string, { fragile: number; total: number }>();
  for (const f of findings) {
    const e = per.get(f.file) ?? { fragile: 0, total: 0 };
    e.total++;
    if (f.kind === "fragile") e.fragile++;
    per.set(f.file, e);
  }
  return [...per.entries()].filter(([, e]) => e.fragile > 0).sort((a, b) => b[1].fragile - a[1].fragile).slice(0, 10);
}

function duplicates(findings: Finding[]) {
  const map = new Map<string, Finding[]>();
  for (const f of findings) {
    if (f.selector === null || f.kind === "stable") continue;
    const key = `${f.method} ${f.selector}`;
    const arr = map.get(key);
    if (arr) arr.push(f);
    else map.set(key, [f]);
  }
  return [...map.values()].filter((l) => l.length >= 2).sort((a, b) => b.length - a.length).slice(0, 10);
}

// Two orthogonal client-safe axes kept as independent flags on purpose (an auditor may
// want paths but no code, or vice versa). `share` is a convenience that sets both.
export interface RenderOptions {
  share?: boolean;        // convenience: turns on both maskPaths + hideSnippets
  maskPaths?: boolean;    // show only file basenames, not full paths
  hideSnippets?: boolean; // omit the expandable source snippets
}

const APP_URL = "https://stackme-app.vercel.app/locate-me"; // where you run your own audit
const REPO_URL = "https://github.com/stackme-io/StackMe";   // source

export function renderHtml(d: ReportData, opts: RenderOptions = {}): string {
  const maskPaths = opts.maskPaths ?? opts.share ?? false;
  const hideSnippets = opts.hideSnippets ?? opts.share ?? false;
  const showPath = (p: string) => (maskPaths ? (p.split(/[\\/]/).pop() ?? p) : p);
  const k = d.summary.byKind;

  const chips = (["fragile", "stable", "context", "dynamic"] as Kind[])
    .map((kind) => `<div class="chip"><span class="dot" style="background:${KIND_COLOR[kind]}"></span><b>${k[kind]}</b> ${kind}</div>`)
    .join("");

  const hot = hotFiles(d.findings)
    .map(([file, e]) => `<div class="row"><code>${esc(showPath(file))}</code><span class="loc">${e.fragile} fragile / ${e.total}</span></div>`)
    .join("") || `<div class="muted">none - no fragile locators</div>`;

  const dupes = duplicates(d.findings)
    .map((list) => {
      const where = list.slice(0, 4).map((f) => `${esc(showPath(f.file))}:${f.line}`).join(", ");
      const more = list.length > 4 ? ` +${list.length - 4}` : "";
      return `<div class="row"><code>${esc(list[0].selector ?? "")}</code><span class="loc">×${list.length} <span style="color:${KIND_COLOR[list[0].kind]}">${list[0].kind}</span></span></div><div class="muted small">${where}${more}</div>`;
    })
    .join("") || `<div class="muted">none</div>`;

  const fragile = d.findings.filter((f) => f.kind === "fragile");
  const fragileRows = fragile.slice(0, 50)
    .map((f) => {
      const head = `<div class="row"><code>${esc(f.method)}(${esc(JSON.stringify(f.selector))})</code><span class="loc">${esc(showPath(f.file))}:${f.line}</span></div><div class="why">${esc(f.reason)}</div>`;
      if (hideSnippets || !f.snippet) return `<div class="finding">${head}</div>`;
      return `<details class="finding" open><summary>${head}</summary><pre class="snip">${esc(f.snippet)}</pre></details>`;
    })
    .join("") || `<div class="muted">none</div>`;
  const moreFragile = fragile.length > 50 ? `<div class="muted small">…and ${fragile.length - 50} more</div>` : "";
  const showTools = !hideSnippets && fragile.some((f) => !!f.snippet);
  const tools = showTools
    ? `<div class="tools"><button type="button" onclick="toggleAll(true)">Expand all</button><button type="button" onclick="toggleAll(false)">Collapse all</button></div>`
    : "";

  const plaque = `Static audit of <b>locator shape</b> - tests were not run. ${d.summary.coverage.total} locator calls analyzed, ${d.summary.coverage.dynamic} dynamic (not classified). This is a <b>first pass, not a full-suite verdict</b>, and <b>not a project score or grade</b> - every verdict is per-locator.`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LocateMe report</title>
<style>
:root{--bg:#0f1320;--card:#171c2e;--ink:#e6e9f2;--muted:#8b93a7;--line:#262d44}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:32px}
.wrap{max-width:880px;margin:0 auto}
h1{font-size:19px;margin:0 0 2px}
.muted{color:var(--muted)} .small{font-size:12px}
.verdict{font-size:21px;font-weight:600;margin:22px 0 8px}
.verdict code{font-size:16px;background:#222a44;padding:1px 6px;border-radius:5px;color:#cdd3e6}
.plaque{font-size:13px;color:var(--muted);border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin:12px 0 22px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 18px;margin:14px 0}
.card h2{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:0 0 10px}
.chips{display:flex;gap:10px;flex-wrap:wrap}
.chip{display:flex;gap:8px;align-items:baseline;border:1px solid var(--line);border-radius:999px;padding:6px 12px}
.chip b{font-size:18px}
.dot{width:9px;height:9px;border-radius:50%;display:inline-block}
.row{display:flex;justify-content:space-between;gap:14px;align-items:baseline;padding:7px 0;border-top:1px solid var(--line)}
.card .row:first-of-type{border-top:0}
.finding{border-top:1px solid var(--line);padding:8px 0}
.card .finding:first-of-type{border-top:0}
.finding .row{border-top:0;padding:0}
.why{color:var(--muted);font-size:12px;margin-top:3px}
summary{cursor:pointer;list-style:none;display:block}
summary::-webkit-details-marker{display:none}
summary::marker{content:""}
details.finding[open]>summary .loc::after{content:" ▾"}
.snip{margin:8px 0 0;background:#0c1020;border:1px solid var(--line);border-radius:6px;padding:10px 12px;overflow:auto;font:12px/1.5 ui-monospace,Consolas,monospace;color:#aab2cc;white-space:pre}
code{font-family:ui-monospace,Consolas,monospace;font-size:13px;color:#cdd3e6;word-break:break-all}
.loc{color:var(--muted);font-size:12px;white-space:nowrap}
footer{color:var(--muted);font-size:12px;margin-top:28px;border-top:1px solid var(--line);padding-top:14px}
a{color:#7aa2ff;text-decoration:none} a:hover{text-decoration:underline}
.tools{display:flex;gap:8px;margin:0 0 12px}.tools button{background:transparent;border:1px solid var(--line);color:var(--muted);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer}.tools button:hover{color:var(--ink)}
@media print{body{background:#fff;color:#111;padding:0}.card{background:#fff;border-color:#ddd}.plaque,.card h2,.muted,.loc,.why{color:#555}.verdict code,code{color:#111;background:#f0f0f0}.snip{background:#f6f6f6;color:#333;border-color:#ddd}:root{--line:#ddd}}
</style></head>
<body><div class="wrap">
  <h1>LocateMe - locator audit</h1>
  <div class="muted small">${esc(showPath(d.target))} · ${d.summary.files} files · ${new Date(d.scannedAt).toLocaleString()}</div>

  <div class="verdict">${verdict(d)}</div>
  <div class="plaque">ⓘ ${plaque}</div>

  <div class="card"><h2>By kind</h2><div class="chips">${chips}</div></div>
  <div class="card"><h2>Hot files (by fragile)</h2>${hot}</div>
  <div class="card"><h2>Duplicates (fragile / context, ≥2)</h2>${dupes}</div>
  <div class="card"><h2>Fragile locators (${fragile.length})</h2>${tools}${fragileRows}${moreFragile}</div>

  <div class="plaque" style="margin-top:22px">Before you act or send this - it's <b>locator shape only</b>, not a full verdict and not a score. Open the top findings and confirm them in context first.</div>
  <footer>Made with <b>LocateMe</b> · <a href="${APP_URL}">run your own audit</a> · <a href="${REPO_URL}">source</a> - static, local, open-source. Shape only; verify before acting.</footer>
</div><script>function toggleAll(o){document.querySelectorAll('details.finding').forEach(function(d){d.open=o})}</script></body></html>`;
}
