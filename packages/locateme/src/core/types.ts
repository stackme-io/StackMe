// Shared types for LocateMe core (browser-safe — no Node deps).
// ReportData is the contract that JSON, the CLI HTML, and the hub UI all read.

export type Kind = "fragile" | "stable" | "context" | "dynamic";

export interface Finding {
  file: string; // relative path
  line: number;
  method: string;
  selector: string | null; // null === dynamic
  kind: Kind;
  reason: string;
  snippet?: string; // source lines around a fragile locator
}

export interface ReportData {
  tool: string;
  version: string;
  scannedAt: string;
  target: string;
  summary: {
    files: number;
    locatorCalls: number;
    byKind: Record<Kind, number>;
    coverage: { total: number; classified: number; dynamic: number };
  };
  findings: Finding[];
}

// Input to the analyzer: a file's path + its full text. Same shape for CLI (disk)
// and browser (File System Access API) — only the source of the text differs.
export interface SourceFileInput {
  path: string;
  text: string;
}
