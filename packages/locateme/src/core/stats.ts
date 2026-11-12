// Anonymous, opt-in stats row. Built FROM SCRATCH from a whitelist - never by trimming
// ReportData - so a new field in the report can never leak into what we send.
// Contains no code, selectors, paths, file names, project name or time.

import type { Kind, ReportData } from "./types";
import type { Detection } from "./detect";

export const STATS_SCHEMA = 1 as const;
// Bump when classification rules change, so old and new rows aren't mixed blindly.
export const RULES_VERSION = "2026-11" as const;
// Below this a row describes the suite almost exactly, and shares are noise.
export const STATS_MIN_LOCATORS = 50;

export type SuiteAge = "<1y" | "1-3y" | "3-5y" | "5y+";
export const SUITE_AGES: SuiteAge[] = ["<1y", "1-3y", "3-5y", "5y+"];

export type StatsFramework = "Playwright" | "Cypress" | "Selenium";
export type Rounded = number | "<5";

const SIZE_BUCKETS: Array<[number, string]> = [
  [10000, "10000+"], [5000, "5000-9999"], [2500, "2500-4999"], [1000, "1000-2499"],
  [500, "500-999"], [250, "250-499"], [100, "100-249"], [50, "50-99"],
];

// Every sub-cause belongs to exactly one class. Unknown ids are dropped, and a test
// fails if this list drifts from classify.ts.
export const STATS_SUBCAUSES: Record<Exclude<Kind, "dynamic">, readonly string[]> = {
  fragile: [
    "chain-positional", "css-autoclass", "css-id-generated", "css-positional",
    "css-structural-depth", "css-utility", "selenium-id-generated", "text-loose",
    "xpath-absolute", "xpath-axis", "xpath-id-generated", "xpath-positional",
  ],
  context: [
    "chain-positional-edge", "css-class", "css-data-unknown", "method-text",
    "selenium-classname", "selenium-linktext", "selenium-partiallinktext",
    "selenium-tagname", "xpath-attr", "xpath-data-unknown", "xpath-text",
  ],
  stable: [
    "css-id", "css-testattr", "cy-alias", "method-stable", "selenium-id",
    "selenium-name", "xpath-id", "xpath-testattr",
  ],
};

export interface StatsRow {
  schema: typeof STATS_SCHEMA;
  rules: typeof RULES_VERSION;
  framework: StatsFramework;
  size: string;
  age?: SuiteAge;
  kinds: Record<Kind, Rounded>;
  sub: Record<string, Rounded>;
}

// 0 stays 0; 1-4 -> "<5"; 5-99 -> nearest 5; 100+ -> two significant digits.
export function roundCount(n: number): Rounded {
  if (n <= 0) return 0;
  if (n < 5) return "<5";
  if (n < 100) return Math.max(5, Math.round(n / 5) * 5);
  const step = 10 ** (String(Math.round(n)).length - 2);
  return Math.round(n / step) * step;
}

export function sizeBucket(locators: number): string | null {
  for (const [min, label] of SIZE_BUCKETS) if (locators >= min) return label;
  return null;
}

export type StatsBlock = "small" | "notFolder" | "unknownFramework";

// Why sharing is unavailable for this audit, or null when it is allowed.
export function statsBlockedReason(
  report: ReportData,
  detection: Detection | null,
  fromFolder: boolean,
): StatsBlock | null {
  if (!fromFolder) return "notFolder";
  if (!detection || detection.framework === "unknown") return "unknownFramework";
  if (report.summary.locatorCalls < STATS_MIN_LOCATORS) return "small";
  return null;
}

// `report` should already be scoped to the files the user kept (scopedReport).
export function buildStats(report: ReportData, detection: Detection, age?: SuiteAge): StatsRow | null {
  if (detection.framework === "unknown") return null;
  const size = sizeBucket(report.summary.locatorCalls);
  if (!size) return null;

  const by = report.summary.byKind;
  const kinds: Record<Kind, Rounded> = {
    fragile: roundCount(by.fragile),
    stable: roundCount(by.stable),
    context: roundCount(by.context),
    dynamic: roundCount(by.dynamic),
  };

  const counts = new Map<string, number>();
  for (const f of report.findings) {
    if (!f.subcause || f.kind === "dynamic") continue;
    if (!STATS_SUBCAUSES[f.kind].includes(f.subcause)) continue;
    counts.set(f.subcause, (counts.get(f.subcause) ?? 0) + 1);
  }
  const sub: Record<string, Rounded> = {};
  for (const key of [...counts.keys()].sort()) {
    const v = roundCount(counts.get(key)!);
    if (v !== 0) sub[key] = v;
  }

  const row: StatsRow = {
    schema: STATS_SCHEMA,
    rules: RULES_VERSION,
    framework: detection.framework,
    size,
    kinds,
    sub,
  };
  if (age) row.age = age;
  return row;
}
