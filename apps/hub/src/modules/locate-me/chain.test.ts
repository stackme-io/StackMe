import { describe, it, expect } from 'vitest'
import { analyze } from '@locateme/core/analyze'

const code = `import { test, expect } from "@playwright/test";
test("x", async ({ page }) => {
  await expect(page.getByTestId("todo-item")).toHaveCount(3);
  const firstTodo = page.getByTestId("todo-item").nth(0);
  const secondTodo = page.getByTestId("todo-item").nth(1);
  await page.getByTestId("todo-item").nth(1).getByRole("checkbox").check();
  await page.locator(".row").filter({ hasText: "Paid" }).nth(2).click();
  await page.getByRole("button").first().click();
});`

describe('positional chain step is kept for display', () => {
  const r = analyze([{ path: 'todo.spec.ts', text: code }], 'x')
  const at = (line: number) => r.findings.filter(f => f.line === line)

  it('plain locator has no chain', () => {
    expect(at(3)[0].chain).toBeUndefined()
    expect(at(3)[0].kind).toBe('stable')
  })

  it('records .nth(0) as an edge and .nth(1) as an index', () => {
    expect(at(4)[0]).toMatchObject({ kind: 'context', chain: '.nth(0)' })
    expect(at(5)[0]).toMatchObject({ kind: 'fragile', chain: '.nth(1)' })
  })

  it('attaches the step only to the locator it refines', () => {
    const testId = at(6).find(f => f.method === 'getByTestId')!
    const checkbox = at(6).find(f => f.method === 'getByRole')!
    expect(checkbox.chain).toBeUndefined()
    expect(testId).toMatchObject({ kind: 'fragile', chain: '.nth(1)' })
  })

  it('passes through .filter and keeps .first()', () => {
    expect(at(7)[0].chain).toBe('.nth(2)')
    expect(at(8)[0].chain).toBe('.first()')
  })
})
