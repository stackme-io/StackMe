// B0.2 SPIKE (throwaway) — does ts-morph bundle + run in the browser via Vite?
// Gate question: in-memory FS parse works, no node:fs/path runtime crash.
// Delete this file + spike.html once the gate decision is made.

import { Project, SyntaxKind } from "ts-morph";

const SAMPLE = `
import { test, expect } from '@playwright/test';

test('login', async ({ page }) => {
  await page.locator('//div[3]/span[2]/button').click();      // fragile (structural xpath)
  await page.getByRole('button', { name: 'Submit' }).click(); // stable
  await page.locator('.list > li:nth-child(2)').click();      // fragile (nth)
  await page.locator('div.css-1a2b3c').click();               // fragile (auto-class)
  await page.getByText('Welcome').isVisible();                // context
  await page.locator(dynamicSelector).click();               // dynamic
});
`;

interface Hit { method: string; selector: string; line: number; }

export function runSpike(): { ok: boolean; hits: Hit[]; error?: string } {
  try {
    const project = new Project({ useInMemoryFileSystem: true });
    const sf = project.createSourceFile("sample.spec.ts", SAMPLE);
    const hits: Hit[] = [];

    sf.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const call = node.asKindOrThrow(SyntaxKind.CallExpression);
      const expr = call.getExpression();
      if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) return;
      const method = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName();
      if (!/^(locator|getBy\w+)$/.test(method)) return;
      const arg = call.getArguments()[0];
      const selector = arg ? arg.getText() : "(dynamic)";
      hits.push({ method, selector, line: call.getStartLineNumber() });
    });

    return { ok: true, hits };
  } catch (e) {
    return { ok: false, hits: [], error: (e as Error).message };
  }
}

const out = document.getElementById("out");
if (out) {
  const res = runSpike();
  if (res.ok) {
    const lines = res.hits.map((h) => `  line ${h.line}: ${h.method}(${h.selector})`);
    out.textContent =
      `✅ SPIKE OK — ts-morph parsed in the browser.\n` +
      `locator calls found: ${res.hits.length}\n\n` +
      lines.join("\n");
    // eslint-disable-next-line no-console
    console.log("[spike] OK", res.hits);
  } else {
    out.textContent = `❌ SPIKE FAILED:\n${res.error}`;
    // eslint-disable-next-line no-console
    console.error("[spike] FAILED", res.error);
  }
}
