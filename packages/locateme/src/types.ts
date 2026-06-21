// Shared types for LocateMe. The ReportData shape is the contract that both the
// JSON file and the HTML report are built from.

export type Kind = "fragile" | "stable" | "context" | "dynamic";

export interface Finding {
  file: string; // absolute during scan; relative in the final report
  line: number;
  method: string;
  selector: string | null; // null === dynamic
  kind: Kind;
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
  findings: Finding[]; // relative paths
}
