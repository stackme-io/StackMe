// LocateMe — static locator-fragility audit for Playwright/TypeScript test suites.
// Iteration 1.2: vertical slice — find page.locator(...) calls and count them.
// Goal: prove that ts-morph + AST traversal work end to end.
//
// Run:     npm start
// Expect:  "found 4 .locator() calls" (see fixtures/sample — 3 in spec + 1 in page object).
//
// Next (dev plan): 1.3 — all locator types + extract the selector argument.

import { Project, SyntaxKind } from "ts-morph";
import path from "node:path";
import { fileURLToPath } from "node:url";

// __dirname is not available in ESM, derive it manually
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// For now scan a fixed fixture folder. Later: a folder passed as a CLI argument.
const fixtureDir = path.resolve(__dirname, "../fixtures/sample");
// ts-morph glob wants forward slashes (backslashes break globbing on Windows)
const glob = path.join(fixtureDir, "**/*.ts").replace(/\\/g, "/");

function main(): void {
  // 1. Load source files into a ts-morph project (it builds the AST).
  const project = new Project();
  project.addSourceFilesAtPaths(glob);

  const files = project.getSourceFiles();
  let locatorCalls = 0;

  // 2. Walk every file and every node in the tree.
  for (const sourceFile of files) {
    sourceFile.forEachDescendant((node) => {
      // We only care about function calls: foo(...)
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const call = node.asKindOrThrow(SyntaxKind.CallExpression);

      // Left side of the call. Look for <something>.locator
      const expr = call.getExpression();
      if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) return;
      const access = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression);

      // Method name === "locator" → this is a .locator(...) call
      if (access.getName() === "locator") {
        locatorCalls++;
      }
    });
  }

  console.log(`scanned ${files.length} file(s) in ${fixtureDir}`);
  console.log(`found ${locatorCalls} .locator() calls`);
}

main();
