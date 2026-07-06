// Fragility classification - browser-safe, pure functions. The 80%-risk core.
import type { Kind, Confidence } from "./types.js";

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
}

const STABLE_METHODS = new Set(["getByRole", "getByTestId", "getByLabel"]);
const CONTEXT_METHODS = new Set(["getByText", "getByPlaceholder", "getByTitle", "getByAltText", "cy.contains"]);

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
  if (/@(data-testid|data-test|data-cy|data-qa)\b/i.test(s)) return {
    kind: "stable", confidence: "verdict", subcause: "xpath-testattr",
    reason: "Anchored on a test attribute.",
    prefer: "Solid. getByTestId('...') reads more idiomatically than raw XPath.",
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
  if (/\[data-(testid|test|cy|qa)\b/i.test(s)) return {
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
  return {
    kind: "context", confidence: "context", subcause: "css-class",
    reason: "Class/attribute selector - stability depends on your project.",
    prefer: "First pass. If this is a styling class it can move on redesign - getByRole or a test id survives a restyle.",
  };
}

// Selenium By.* strategies. XPath/CSS reuse the shape classifiers (form is form,
// whatever the framework). The direct strategies map by what the strategy targets.
// tagName is over-broad (matches many, takes the first) - a selection risk, NOT
// fragility to layout change; we say so honestly instead of forcing it onto the axis.
export function classifySelenium(strategy: string, value: string | null): Classification {
  if (value === null) return { kind: "dynamic", reason: "Selector built at runtime (variable/concatenation) - not classified." };
  const s = value.trim();
  switch (strategy) {
    case "cssSelector": return classifyCss(s);
    case "xpath": return classifyXpath(s);
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

export function classify(method: string, selector: string | null): Classification {
  if (method.startsWith("By.")) return classifySelenium(method.slice(3), selector);
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
