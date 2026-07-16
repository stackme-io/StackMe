// LocatorExtractor for the JS/TS family (Playwright + Cypress), on ts-morph.
// Moved out of analyze.ts so analyze() is parser-agnostic and a second extractor
// (tree-sitter for Java) can plug into the same pipeline. Pure extraction, no
// classification - it only answers "which calls are locators and what string do
// they use". Non-literal args (variable / concat / template) -> selector null -> dynamic.

import { Project, SyntaxKind, Node } from "ts-morph";
import type { LocatorExtractor, RawLocator, SourceFileInput, ExtractResult, Usage } from "./types.js";

// Methods that drive an action on the located element (Playwright + Cypress). If a
// locator is the receiver of one of these in the same statement, its usage is "action".
const ACTION_METHODS = new Set([
  "click", "dblclick", "rightclick", "fill", "type", "pressSequentially", "press",
  "check", "uncheck", "setChecked", "selectOption", "selectText", "select",
  "setInputFiles", "selectFile", "hover", "focus", "blur", "dragTo", "tap", "clear",
  "scrollIntoViewIfNeeded", "scrollIntoView", "trigger",
]);

// Methods/matchers that read or assert element state (never mutate it). A locator
// terminating in one of these - or passed into expect(...) - has usage "assert".
const ASSERT_METHODS = new Set([
  "toBeVisible", "toBeHidden", "toHaveText", "toContainText", "toHaveValue",
  "toHaveAttribute", "toBeChecked", "toBeEnabled", "toBeDisabled", "toHaveCount",
  "toBeFocused", "toHaveClass", "toHaveId", "toHaveCSS", "toBeEditable", "toBeEmpty",
  "textContent", "innerText", "inputValue", "getAttribute", "isVisible", "isHidden",
  "isChecked", "isEnabled", "isDisabled", "isEditable", "count", "allTextContents",
  "allInnerTexts", "should",
]);

// Locator-returning refinements: walk THROUGH these to the real terminator.
const CHAIN_METHODS = new Set([
  "filter", "nth", "first", "last", "or", "locator", "frameLocator",
  "getByRole", "getByText", "getByTestId", "getByLabel", "getByPlaceholder", "getByTitle", "getByAltText",
  "find", "eq", "parent", "parents", "children", "closest", "next", "nextAll", "prev", "prevAll", "siblings", "within", "its",
]);

// Determine how a locator call is used in its own statement, purely from the AST.
// Precision-first: anything we can't resolve in the same expression (variable, helper,
// bare await, cross-statement) returns "unknown" so classify() won't tighten on it.
function detectUsage(callNode: Node): Usage {
  let node: Node = callNode;
  for (let i = 0; i < 25; i++) {
    const parent = node.getParent();
    if (!parent) return "unknown";
    if (Node.isAwaitExpression(parent) || Node.isParenthesizedExpression(parent) ||
        Node.isNonNullExpression(parent) || Node.isAsExpression(parent)) {
      node = parent; continue;
    }
    if (Node.isCallExpression(parent)) {
      const callee = parent.getExpression();
      const name = Node.isIdentifier(callee) ? callee.getText()
        : Node.isPropertyAccessExpression(callee) ? callee.getName() : "";
      return name === "expect" ? "assert" : "unknown"; // passed into a call/helper
    }
    if (Node.isPropertyAccessExpression(parent) && parent.getExpression().compilerNode === node.compilerNode) {
      const grand = parent.getParent();
      if (grand && Node.isCallExpression(grand)) {
        const m = parent.getName();
        if (ACTION_METHODS.has(m)) return "action";
        if (ASSERT_METHODS.has(m)) return "assert";
        if (CHAIN_METHODS.has(m)) { node = grand; continue; }
        return "unknown";
      }
      return "unknown";
    }
    return "unknown";
  }
  return "unknown";
}

const LOCATOR_METHODS = new Set([
  "locator", "getByRole", "getByText", "getByTestId",
  "getByLabel", "getByPlaceholder", "getByTitle", "getByAltText",
]);

// Cypress locator commands. Matched only when the call chain roots at `cy`, so a
// generic .get()/.find()/.contains() on some other object is not taken for a locator.
const CYPRESS_METHODS = new Set(["get", "find", "contains"]);

// Walk the leftmost side of a chain to its base identifier
// (e.g. cy.get('a').find('b') -> "cy").
function chainRootName(node: Node): string | null {
  let cur: Node = node;
  for (;;) {
    if (Node.isIdentifier(cur)) return cur.getText();
    if (Node.isPropertyAccessExpression(cur)) { cur = cur.getExpression(); continue; }
    if (Node.isCallExpression(cur)) { cur = cur.getExpression(); continue; }
    if (Node.isElementAccessExpression(cur)) { cur = cur.getExpression(); continue; }
    return null;
  }
}

function getLiteralSelector(arg: Node | undefined): string | null {
  if (!arg) return null;
  if (Node.isStringLiteral(arg) || Node.isNoSubstitutionTemplateLiteral(arg)) {
    return arg.getLiteralValue();
  }
  return null;
}

// Playwright text-content methods whose match can be loosened - a regex first arg, or an
// { exact: false } option. A loose match is provably fragile from the string alone.
const TEXT_METHODS = new Set(["getByText", "getByPlaceholder", "getByTitle", "getByAltText"]);

function isLooseTextMatch(method: string, args: Node[]): boolean {
  if (!TEXT_METHODS.has(method)) return false;
  if (args[0] && Node.isRegularExpressionLiteral(args[0])) return true;
  const opts = args[1];
  if (opts && Node.isObjectLiteralExpression(opts)) {
    for (const prop of opts.getProperties()) {
      if (Node.isPropertyAssignment(prop) && prop.getName() === "exact"
          && prop.getInitializer()?.getKind() === SyntaxKind.FalseKeyword) return true;
    }
  }
  return false;
}

export class TsMorphExtractor implements LocatorExtractor {
  extract(file: SourceFileInput): ExtractResult {
    const project = new Project({ useInMemoryFileSystem: true });
    const sf = project.createSourceFile(file.path, file.text, { overwrite: true });
    const out: RawLocator[] = [];

    sf.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const call = node.asKindOrThrow(SyntaxKind.CallExpression);
      const expr = call.getExpression();
      if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) return;
      const pae = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
      const rawMethod = pae.getName();
      let method: string;
      if (LOCATOR_METHODS.has(rawMethod)) method = rawMethod;
      else if (CYPRESS_METHODS.has(rawMethod) && chainRootName(pae) === "cy") method = "cy." + rawMethod;
      else return;

      // cy.contains(selector, text): the text (2nd arg) is the real matcher; cy.contains(text): 1st.
      let selArg = call.getArguments()[0];
      if (rawMethod === "contains") {
        const second = call.getArguments()[1];
        if (second && (Node.isStringLiteral(second) || Node.isNoSubstitutionTemplateLiteral(second))) selArg = second;
      }

      out.push({
        method,
        selector: getLiteralSelector(selArg),
        line: call.getStartLineNumber(),
        usage: detectUsage(call),
        looseText: isLooseTextMatch(method, call.getArguments()),
      });
    });

    // ts-morph is lenient and doesn't surface parse errors here - always [].
    return { locators: out, errors: [] };
  }
}
