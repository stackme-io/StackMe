// Shared types for LocateMe core (browser-safe - no Node deps).
// ReportData is the contract that JSON, the CLI HTML, and the hub UI all read.

export type Kind = "fragile" | "stable" | "context" | "dynamic";

// How firmly we stand behind the verdict. "verdict" = confident (fragile/stable),
// "context" = conditional first-pass note. Drives the inspector's tone.
export type Confidence = "verdict" | "context";

// How the locator is used in the same statement: driving an action (click/fill/...),
// checked in an assertion (expect/.toBeVisible/...), or unknown (assigned to a var,
// returned, passed to a helper - we don't resolve across statements). A text-based
// locator is riskier in an action than in an assertion. Precision-first: "unknown"
// behaves exactly as before (no tightening).
export type Usage = "action" | "assert" | "unknown";

export interface Finding {
  file: string; // relative path
  line: number;
  method: string;
  selector: string | null; // null === dynamic
  kind: Kind;
  reason: string;
  subcause?: string; // stable id of the matched sub-cause (e.g. "css-autoclass")
  confidence?: Confidence;
  prefer?: string; // concrete upgrade suggestion along the prefer-ladder (prose / hedge)
  preferCode?: string; // copy-paste-ready replacement - ONLY for meaning-preserving swaps
  usage?: Usage; // action/assert/unknown - how the locator is used in its statement
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
    unparsed?: number; // regions the parser couldn't read (present only when > 0)
    // Classes that extend a base outside the scan - their inherited @FindBy locators
    // weren't audited. Present only when non-empty. (Selenium/Java incompleteness note.)
    unresolvedBases?: Array<{ className: string; base: string }>;
  };
  findings: Finding[];
}

// Input to the analyzer: a file's path + its full text. Same shape for CLI (disk)
// and browser (File System Access API) - only the source of the text differs.
export interface SourceFileInput {
  path: string;
  text: string;
}

// A locator call found by an extractor, BEFORE classification. Extractors (ts-morph
// for JS/TS, tree-sitter for Java later) produce these; analyze() runs classify()
// over them. This is the seam that keeps analyze() parser-agnostic.
export interface RawLocator {
  method: string;          // "getByRole", "cy.get", "By.xpath", ...
  selector: string | null; // literal value, or null === dynamic (built at runtime)
  line: number;            // 1-based line of the locator call
  usage?: Usage;           // how it's used in the same statement (action/assert/unknown)
  looseText?: boolean;     // text method with a regex or { exact: false } - a loose match
  positional?: "index" | "edge"; // positional chain step: .nth(k)/.eq(k) = index, .first/.last/.nth(0) = edge
}

// A region the parser could not read (tree-sitter ERROR / MISSING node). We surface
// these rather than silently drop them - "couldn't parse this section" over silence.
export interface ParseError {
  line: number;            // 1-based line where the unparsable region starts
}

// A class the extractor saw, with its direct superclass (if any). Lightweight index -
// NOT a full symbol table: just enough to flag "extends X where X is outside the scan"
// (its inherited @FindBy locators couldn't be audited). No field merge (fragility is
// judged at each locator's declaration site).
export interface ClassInfo {
  name: string;
  superclass: string | null; // simple name of the direct base, or null
  file: string;
  line: number;
}

// Extractor output: locators found + regions that failed to parse + classes seen.
// errors/classes are [] / undefined for parsers that don't surface them (ts-morph).
export interface ExtractResult {
  locators: RawLocator[];
  errors: ParseError[];
  classes?: ClassInfo[];
}

// A language/framework front-end: turns one source file into raw locators + parse
// errors. No classification here - only "what calls are locators, what string, and
// what couldn't be read".
export interface LocatorExtractor {
  extract(file: SourceFileInput): ExtractResult;
}
