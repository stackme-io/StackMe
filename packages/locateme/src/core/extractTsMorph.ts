// LocatorExtractor for the JS/TS family (Playwright + Cypress), on ts-morph.
// Moved out of analyze.ts so analyze() is parser-agnostic and a second extractor
// (tree-sitter for Java) can plug into the same pipeline. Pure extraction, no
// classification - it only answers "which calls are locators and what string do
// they use". Non-literal args (variable / concat / template) -> selector null -> dynamic.

import { Project, SyntaxKind, Node } from "ts-morph";
import type { LocatorExtractor, RawLocator, SourceFileInput } from "./types.js";

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

export class TsMorphExtractor implements LocatorExtractor {
  extract(file: SourceFileInput): RawLocator[] {
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
      });
    });

    return out;
  }
}
