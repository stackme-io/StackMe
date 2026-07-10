// Fragility classification - browser-safe, pure functions. The 80%-risk core.
import type { Kind, Confidence, Usage } from "./types.js";

// Teaching sub-causes carry a concrete "prefer" upgrade along the prefer-ladder
// (Role -> Label -> Text for assertions -> TestId -> raw CSS/XPath). Verdict buckets
// speak firmly; context buckets stay conditional ("first pass"). Good locators get no
// prefer note - a quiet linter is a trusted one.
//
// Precision-first: where a signal depends on things we cannot see (DOM, author intent)
// we only give a firm "fragile" verdict on signatures that are unmistakable from the
// string alone. When unsure we stay stable/silent rather than risk a false "fragile"
// that a read-only audit gives no way to dismiss. (getByRole-without-name was dropped
// as noise on the recommended locator; framework-generated id detection added instead.)
export interface Classification {
  kind: Kind;
  reason: string;
  subcause?: string;
  confidence?: Confidence;
  prefer?: string;
  preferCode?: string; // copy-ready swap - set only when mechanically safe (3d)
}

const STABLE_METHODS = new Set(["getByRole", "getByTestId", "getByLabel"]);
const CONTEXT_METHODS = new Set(["getByText", "getByPlaceholder", "getByTitle", "getByAltText", "cy.contains"]);

// Known automated-test hook attributes - an explicit contract between the app and the
// suite, safe to anchor on. Any other data-* attribute is unknowable from the string
// alone (a deliberate contract vs. volatile state/index/backend-id), so it is hedged as
// context rather than trusted as stable or flagged as fragile.
const TEST_HOOK_ATTR = "testid|test-id|test|qa-id|qa|cy|e2e|automation-id|automation|pw";
const CSS_TEST_HOOK = new RegExp(`\\[data-(${TEST_HOOK_ATTR})\\b`, "i");
const XPATH_TEST_HOOK = new RegExp(`@data-(${TEST_HOOK_ATTR})\\b`, "i");
const CSS_DATA_ANY = /\[data-[\w-]+/i;
const XPATH_DATA_ANY = /@data-[\w-]+/i;

export function isXpath(s: string): boolean {
  return s.startsWith("//") || s.startsWith("(//") || s.startsWith(".//") ||
    s.startsWith("(.//") || s.startsWith("xpath=");
}

// Known framework-generated id signatures. These are confident from the string alone
// - they do not occur in hand-written ids. Precision-first: we downgrade only on these
// unmistakable patterns and otherwise leave the id stable, because a false "fragile" on
// a hand-written id cannot be dismissed from an audit. A hand-written id is fine to miss;
// a hand-written id wrongly flagged is not.
const GENERATED_ID_SIGNATURES: { re: RegExp; lib: string }[] = [
  { re: /:r[0-9a-z]+:/i,           lib: "React useId" },       // :r0:, :r3:, :rf:
  { re: /^radix-/i,                lib: "Radix UI" },
  { re: /^headlessui-/i,           lib: "Headless UI" },
  { re: /^react-aria-?\d/i,        lib: "React Aria" },
  { re: /^ember\d/i,               lib: "Ember" },             // ember1043
  { re: /^mui-\d/i,                lib: "MUI" },               // mui-42
  { re: /^(mat|cdk)-[a-z-]*\d/i,   lib: "Angular Material" },  // mat-input-0, cdk-overlay-3
  { re: /^(chakra|mantine)-/i,     lib: "Chakra / Mantine" },
];

// Returns the library name if the id looks framework-generated, else null.
function detectGeneratedId(id: string): string | null {
  for (const { re, lib } of GENERATED_ID_SIGNATURES) if (re.test(id)) return lib;
  return null;
}

// Not every xpath is fragile: positional/structural = fragile, but xpath anchored
// on a stable id/test attribute won't break from layout changes.
function classifyXpath(raw: string): Classification {
  const s = raw.replace(/^xpath=/, "");
  if (/::/.test(s)) return {
    kind: "fragile", confidence: "verdict", subcause: "xpath-axis",
    reason: "XPath axis traversal - tied to DOM structure, breaks on markup changes.",
    prefer: "Re-anchor on the target's own identity (getByRole, getByLabel, or a test id) instead of walking siblings or ancestors.",
  };
  if (/\[\d+\]/.test(s)) return {
    kind: "fragile", confidence: "verdict", subcause: "xpath-positional",
    reason: "Positional index in the path - breaks when order or layout changes.",
    prefer: "Anchor on the element's text or role instead of its position, e.g. getByRole('button', { name: '...' }).",
  };
  if (/text\(\)|contains\(\s*text/i.test(s)) return {
    kind: "context", confidence: "context", subcause: "xpath-text",
    reason: "Text-based xpath - can break on localization/content changes.",
    prefer: "First pass - fine for assertions. For clicks prefer getByRole(..., { name }); getByText also normalizes whitespace, raw XPath does not.",
  };
  if (XPATH_TEST_HOOK.test(s)) return {
    kind: "stable", confidence: "verdict", subcause: "xpath-testattr",
    reason: "Anchored on a test attribute.",
    prefer: "Solid. getByTestId('...') reads more idiomatically than raw XPath.",
  };
  if (XPATH_DATA_ANY.test(s)) return {
    kind: "context", confidence: "context", subcause: "xpath-data-unknown",
    reason: "A data-* attribute, but not a known test hook. Fine if the app sets it deliberately and it stays stable between builds; brittle if it's state or a derived value (data-state, data-index, a backend id).",
    prefer: "First pass. Confirm it's a real test contract in your app; if not, prefer a data-testid, or getByRole / getByLabel.",
  };
  const xpIdMatch = s.match(/@id\s*=\s*['"]([^'"]+)['"]/i);
  if (xpIdMatch) {
    const lib = detectGeneratedId(xpIdMatch[1]);
    if (lib) return {
      kind: "fragile", confidence: "verdict", subcause: "xpath-id-generated",
      reason: `Framework-generated id (${lib}) - auto-generated ids change between builds or re-renders, so the locator breaks when the id regenerates.`,
      prefer: "Anchor on a data-testid, or getByRole/getByLabel, instead of a generated id.",
    };
  }
  if (/@(id|name)\s*=/i.test(s)) return {
    kind: "stable", confidence: "verdict", subcause: "xpath-id",
    reason: "Anchored on a stable id/name attribute.",
  };
  if (/@[\w-]+\s*=/.test(s)) return {
    kind: "context", confidence: "context", subcause: "xpath-attr",
    reason: "Anchored on an attribute - stability depends on the attribute.",
    prefer: "First pass. If the attribute is a real test contract it is fine; otherwise prefer getByRole or getByLabel.",
  };
  return {
    kind: "fragile", confidence: "verdict", subcause: "xpath-absolute",
    reason: "Structural path with no stable anchor - breaks on any markup change.",
    prefer: "Replace the absolute path with a semantic locator (getByRole / getByLabel / getByTestId) on the target element.",
  };
}

function classifyCss(s: string): Classification {
  if (/:nth-(child|of-type)\b/.test(s) || /\bnth=/.test(s) || /\[\d+\]/.test(s))
    return {
      kind: "fragile", confidence: "verdict", subcause: "css-positional",
      reason: "Positional CSS (:nth-child / index) - breaks when items are added or reordered.",
      prefer: "Anchor on the element's text, role, or test id instead of its position in the list.",
    };
  if (/(^|[.\s>~+])(css|sc)-[a-z0-9]/i.test(s))
    return {
      kind: "fragile", confidence: "verdict", subcause: "css-autoclass",
      reason: "Auto-generated class name (CSS-in-JS) - changes on every build.",
      prefer: "Prefer getByRole or getByTestId - generated class names are styling hooks, not stable identity.",
    };
  if (CSS_TEST_HOOK.test(s)) return {
    kind: "stable", confidence: "verdict", subcause: "css-testattr",
    reason: "Test attribute selector.",
  };
  if (/^#[\w-]+$/.test(s)) {
    const lib = detectGeneratedId(s.slice(1));
    if (lib) return {
      kind: "fragile", confidence: "verdict", subcause: "css-id-generated",
      reason: `Framework-generated id (${lib}) - auto-generated ids change between builds or re-renders, so the locator breaks when the id regenerates.`,
      prefer: "Prefer a data-testid, or getByRole/getByLabel - a stable, intentional hook rather than a generated id.",
    };
    return {
      kind: "stable", confidence: "verdict", subcause: "css-id",
      reason: "Single id selector.",
    };
  }
  if (CSS_DATA_ANY.test(s)) return {
    kind: "context", confidence: "context", subcause: "css-data-unknown",
    reason: "A data-* attribute, but not a known test hook. Fine if the app sets it deliberately and it stays stable between builds; brittle if it's state or a derived value (data-state, data-index, a backend id).",
    prefer: "First pass. Confirm it's a real test contract in your app; if not, prefer a data-testid, or getByRole / getByLabel.",
  };
  return {
    kind: "context", confidence: "context", subcause: "css-class",
    reason: "Class/attribute selector - stability depends on your project.",
    prefer: "First pass. If this is a styling class it can move on redesign - getByRole or a test id survives a restyle.",
  };
}

// The shape classifiers (classifyXpath/classifyCss) speak Playwright idioms in their
// "prefer" advice (getByRole, getByTestId). For Selenium files that advice is wrong -
// Selenium has no getByRole. Re-word the prefer per sub-cause in Selenium terms; the
// verdict/reason/kind are framework-agnostic and reused as-is. Playwright/Cypress never
// pass through here, so their advice is untouched.
const SELENIUM_PREFER: Record<string, string> = {
  "css-positional":    "Anchor on identity, not position - By.id(...), or By.cssSelector(\"[data-testid='...']\").",
  "css-autoclass":     "Generated class name - prefer By.id or a data-testid over a build-time class.",
  "css-id-generated":  "Prefer a data-testid or a stable hand-written id, not a generated one.",
  "css-class":         "First pass. A styling class can move on a restyle - By.id or a data-testid is steadier.",
  "css-data-unknown":  "First pass. Confirm it's a real test contract; otherwise prefer By.cssSelector(\"[data-testid='...']\") or By.id.",
  "xpath-data-unknown": "First pass. Confirm it's a real test contract; otherwise prefer a data-testid or By.id.",
  "xpath-axis":        "Re-anchor on the target's own id or test attribute instead of walking the tree.",
  "xpath-positional":  "Anchor on the element's id or a test attribute instead of its position in the path.",
  "xpath-text":        "First pass - fine for assertions. For clicks, By.id or a data-testid is steadier than text.",
  "xpath-testattr":    "Solid. By.cssSelector(\"[data-testid='...']\") reads more idiomatically than raw XPath.",
  "xpath-attr":        "First pass. If it's a real test contract it's fine; otherwise prefer By.id or a data-testid.",
  "xpath-absolute":    "Replace the absolute path with By.id, a data-testid, or a By.cssSelector on the target element.",
};

function withSeleniumPrefer(c: Classification): Classification {
  if (c.prefer && c.subcause && SELENIUM_PREFER[c.subcause]) return { ...c, prefer: SELENIUM_PREFER[c.subcause] };
  return c;
}

// Selenium By.* strategies. XPath/CSS reuse the shape classifiers (form is form,
// whatever the framework), with prefer re-worded for Selenium. The direct strategies
// map by what the strategy targets. tagName is over-broad (matches many, takes the
// first) - a selection risk, NOT fragility to layout change; we say so honestly
// instead of forcing it onto the axis.
export function classifySelenium(strategy: string, value: string | null): Classification {
  if (value === null) return { kind: "dynamic", reason: "Selector built at runtime (variable/concatenation) - not classified." };
  const s = value.trim();
  switch (strategy) {
    case "cssSelector": return withSeleniumPrefer(classifyCss(s));
    case "xpath": return withSeleniumPrefer(classifyXpath(s));
    case "id": {
      const lib = detectGeneratedId(s);
      if (lib) return {
        kind: "fragile", confidence: "verdict", subcause: "selenium-id-generated",
        reason: `Framework-generated id (${lib}) - auto-generated ids change between builds or re-renders, so By.id breaks when the id regenerates.`,
        prefer: "Anchor on a data-testid or a stable hand-written id, not a generated one.",
      };
      return { kind: "stable", confidence: "verdict", subcause: "selenium-id", reason: "By.id - anchored on a stable id attribute." };
    }
    case "name": return { kind: "stable", confidence: "verdict", subcause: "selenium-name", reason: "By.name - anchored on the name attribute." };
    case "className": return {
      kind: "context", confidence: "context", subcause: "selenium-classname",
      reason: "By.className targets a single class - fine while stable, but a styling class can move on a redesign.",
      prefer: "First pass. If it is a styling hook, prefer By.id, a data-testid, or By.cssSelector on a stable attribute.",
    };
    case "tagName": return {
      kind: "context", confidence: "context", subcause: "selenium-tagname",
      reason: "By.tagName matches by tag alone - over-broad (matches many elements, takes the first). That is a selection risk, not fragility to layout change.",
      prefer: "Over-broad rather than fragile. Target the specific element via By.id, a data-testid, or By.cssSelector.",
    };
    case "linkText": return {
      kind: "context", confidence: "context", subcause: "selenium-linktext",
      reason: "By.linkText matches the visible link text - can break on localization or copy edits.",
      prefer: "First pass. For stability prefer By.id or a test attribute over the link's text.",
    };
    case "partialLinkText": return {
      kind: "context", confidence: "context", subcause: "selenium-partiallinktext",
      reason: "By.partialLinkText matches part of the link text - breaks on small copy changes or localization.",
      prefer: "Fragile to text. Prefer By.id or a test attribute.",
    };
    default: return { kind: "dynamic", reason: `By.${strategy} - not classified in this pass.` };
  }
}

// Optional call-site context for classification. `usage` (from the extractor's AST)
// only sharpens or softens the advice on text-based buckets - it never changes the
// verdict. Rationale: usage=action raises the STAKES of a brittle text match, but not
// the PROOF - whether the visible text is stable and unique is unknowable from the
// string, so a firm "fragile" would overreach. (A firm verdict for text belongs on a
// loose-match signature - regex / exact:false / contains(text) - not on usage.)
export interface ClassifyContext { usage?: Usage }

// Text-based buckets whose advice depends on how the locator is used: matching by
// visible text is squarely fine for an assertion but weaker for a click (copy edits,
// i18n, possible non-uniqueness). Only these react to `usage` - and only in wording.
const TEXT_SUBCAUSES = new Set(["method-text", "xpath-text"]);

// Apply call-site usage to a text-based verdict - WORDING ONLY, never the kind.
// Precision-first: unknown usage changes nothing; Selenium never reaches here (returns
// earlier); Cypress keeps its own wording. Action sharpens the note (role+name is
// steadier); assertion softens it (matching by text is the point of the check).
function applyUsage(c: Classification, method: string, usage?: Usage): Classification {
  if (!usage || usage === "unknown") return c;
  if (method.startsWith("cy.")) return c;
  if (!c.subcause || !TEXT_SUBCAUSES.has(c.subcause)) return c;
  if (usage === "assert") {
    return { ...c, prefer: "Fine here - matching by visible text is what an assertion is for. getByText also normalizes whitespace." };
  }
  // usage === "action": sharpen the advice, but stay context - we can't prove from the
  // string that the label is unstable or non-unique, so we don't hand down a verdict.
  return {
    ...c,
    prefer: "Used to drive an action. For a click/fill, getByRole(..., { name }) is usually steadier than visible text (which can drift with copy/i18n and may not be unique). Confirm the label is stable and unique.",
  };
}

// A copy-paste-ready replacement, ONLY when the swap is mechanically safe - the new
// locator matches exactly the same element set, adds no assumption we can't see. We only
// do this for a raw Playwright `locator()` wrapping the default test-hook attribute
// (data-testid), where getByTestId('x') is the idiomatic equivalent. A leading tag is
// dropped (a test id is contractually unique). Anything requiring a role/name/text we do
// not know stays prose-only (never a fake copy-ready).
function safeSwap(method: string, selector: string | null, subcause?: string): string | undefined {
  if (method !== "locator" || !selector) return undefined;
  if (subcause === "css-testattr") {
    const m = selector.match(/\[data-testid\s*=\s*["']([^"']+)["']\]/i);
    if (m) return `getByTestId('${m[1]}')`;
  }
  if (subcause === "xpath-testattr") {
    const m = selector.match(/@data-testid\s*=\s*["']([^"']+)["']/i);
    if (m) return `getByTestId('${m[1]}')`;
  }
  return undefined;
}

export function classify(method: string, selector: string | null, ctx?: ClassifyContext): Classification {
  if (method.startsWith("By.")) return classifySelenium(method.slice(3), selector);
  const c = applyUsage(classifyJs(method, selector), method, ctx?.usage);
  const code = safeSwap(method, selector, c.subcause);
  return code ? { ...c, preferCode: code } : c;
}

function classifyJs(method: string, selector: string | null): Classification {
  if (selector === null) return { kind: "dynamic", reason: "Selector built at runtime (variable/template) - not classified." };
  if (STABLE_METHODS.has(method)) return { kind: "stable", confidence: "verdict", subcause: "method-stable", reason: `User-facing locator (${method}) - recommended, resilient.` };
  if (CONTEXT_METHODS.has(method)) return {
    kind: "context", confidence: "context", subcause: "method-text",
    reason: `Text/label-based locator (${method}) - can break on localization.`,
    prefer: "First pass - fine for assertions. For clicks on dynamic content prefer getByRole(..., { name }) or getByLabel.",
  };

  const s = selector.trim();
  if (s.startsWith("@")) return { kind: "stable", confidence: "verdict", subcause: "cy-alias", reason: "Cypress alias - intent-based reference." };
  return isXpath(s) ? classifyXpath(s) : classifyCss(s);
}
