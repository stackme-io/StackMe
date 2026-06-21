// Fragility classification — browser-safe, pure functions. The 80%-risk core.
import type { Kind } from "./types.js";

export interface Classification {
  kind: Kind;
  reason: string;
}

const STABLE_METHODS = new Set(["getByRole", "getByTestId", "getByLabel"]);
const CONTEXT_METHODS = new Set(["getByText", "getByPlaceholder", "getByTitle", "getByAltText"]);

export function isXpath(s: string): boolean {
  return s.startsWith("//") || s.startsWith("(//") || s.startsWith(".//") ||
    s.startsWith("(.//") || s.startsWith("xpath=");
}

// Not every xpath is fragile: positional/structural = fragile, but xpath anchored
// on a stable id/test attribute won't break from layout changes.
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

export function classify(method: string, selector: string | null): Classification {
  if (selector === null) return { kind: "dynamic", reason: "Selector built at runtime (variable/template) — not classified." };
  if (STABLE_METHODS.has(method)) return { kind: "stable", reason: `User-facing locator (${method}) — recommended, resilient.` };
  if (CONTEXT_METHODS.has(method)) return { kind: "context", reason: `Text/label-based locator (${method}) — can break on localization.` };

  const s = selector.trim();
  return isXpath(s) ? classifyXpath(s) : classifyCss(s);
}
