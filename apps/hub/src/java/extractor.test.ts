// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { initJavaParser } from './parser'
import { JavaTreeSitterExtractor } from './extractor'
import { analyze, registerJavaExtractor } from '@locateme/core/analyze'

// Step 8b gate: extractor over the real tree-sitter Java grammar (wasm) in Node.
// web-tree-sitter@0.20.8 lands in hub/node_modules; tree-sitter-wasms is root-hoisted.
// Try both so it works regardless of where npm placed them.
const here = dirname(fileURLToPath(import.meta.url))
function pick(rels: string[], label: string): string {
  const hit = rels.map(r => resolve(here, r)).find(existsSync)
  if (!hit) throw new Error(`${label} not found in: ${rels.join(', ')}`)
  return hit
}
const coreWasm = pick([
  '../../node_modules/web-tree-sitter/tree-sitter.wasm',        // hub
  '../../../../node_modules/web-tree-sitter/tree-sitter.wasm',  // root
], 'tree-sitter.wasm')
const javaWasm = pick([
  '../../../../node_modules/tree-sitter-wasms/out/tree-sitter-java.wasm', // root
  '../../node_modules/tree-sitter-wasms/out/tree-sitter-java.wasm',       // hub
], 'tree-sitter-java.wasm')

let ext: JavaTreeSitterExtractor
beforeAll(async () => {
  const parser = await initJavaParser({ locateFile: () => coreWasm, grammarPath: javaWasm })
  ext = new JavaTreeSitterExtractor(parser)
  registerJavaExtractor(ext) // so analyze() routes .java to it
}, 20000)

const run = (src: string) => ext.extract({ path: 'T.java', text: src })

describe('JavaTreeSitterExtractor', () => {
  it('By.id string literal (inside findElement)', () => {
    const { locators } = run('class T { void t(){ driver.findElement(By.id("username")); } }')
    expect(locators).toEqual([{ method: 'By.id', selector: 'username', line: 1 }])
  })

  it('By.xpath with escaped quotes is decoded before classify', () => {
    const { locators } = run('class T { void t(){ driver.findElement(By.xpath("//*[@class=\\"card\\"]")); } }')
    expect(locators).toEqual([{ method: 'By.xpath', selector: '//*[@class="card"]', line: 1 }])
  })

  it('non-literal argument -> dynamic (null selector)', () => {
    const { locators } = run('class T { String id = "x"; void t(){ driver.findElement(By.id(id)); } }')
    expect(locators.map(l => [l.method, l.selector])).toEqual([['By.id', null]])
  })

  it('string concatenation -> dynamic', () => {
    const { locators } = run('class T { void t(){ driver.findElement(By.xpath("//div[" + i + "]")); } }')
    expect(locators[0]?.selector).toBeNull()
  })

  it('multiple locators across lines, right line numbers', () => {
    const src = ['class T {', '  By a = By.cssSelector(".btn");', '  By b = By.name("email");', '}'].join('\n')
    const { locators } = run(src)
    expect(locators).toEqual([
      { method: 'By.cssSelector', selector: '.btn', line: 2 },
      { method: 'By.name', selector: 'email', line: 3 },
    ])
  })

  it('surfaces parse errors on broken code, still returns found locators', () => {
    const { locators, errors } = run('class T { void t(){ driver.findElement(By.id("ok")); @@@ } }')
    expect(locators).toEqual([{ method: 'By.id', selector: 'ok', line: 1 }])
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe('JavaTreeSitterExtractor - @FindBy (R2)', () => {
  it('shorthand @FindBy(id="x") -> By.id', () => {
    const { locators } = run('class P { @FindBy(id = "loginButton") Object b; }')
    expect(locators).toEqual([{ method: 'By.id', selector: 'loginButton', line: 1 }])
  })

  it('shorthand @FindBy(css=".submit") -> By.cssSelector', () => {
    const { locators } = run('class P { @FindBy(css = ".submit") Object b; }')
    expect(locators).toEqual([{ method: 'By.cssSelector', selector: '.submit', line: 1 }])
  })

  it('how-form @FindBy(how=How.ID, using="user") -> By.id', () => {
    const { locators } = run('class P { @FindBy(how = How.ID, using = "user") Object b; }')
    expect(locators).toEqual([{ method: 'By.id', selector: 'user', line: 1 }])
  })

  it('how-form @FindBy(how=How.XPATH, using="//div[3]") -> By.xpath (fragile shape)', () => {
    const { locators } = run('class P { @FindBy(how = How.XPATH, using = "//div[3]/a") Object b; }')
    expect(locators).toEqual([{ method: 'By.xpath', selector: '//div[3]/a', line: 1 }])
  })

  it('non-literal using -> dynamic (null selector)', () => {
    const { locators } = run('class P { @FindBy(how = How.ID, using = CONST) Object b; }')
    expect(locators.map(l => [l.method, l.selector])).toEqual([['By.id', null]])
  })

  it('audits @FindBy at declaration - own fields only, no inheritance merge', () => {
    const src = ['class LoginPage extends BasePage {', '  @FindBy(id = "user") Object u;', '  @FindBy(name = "pass") Object p;', '}'].join('\n')
    const { locators } = run(src)
    expect(locators).toEqual([
      { method: 'By.id', selector: 'user', line: 2 },
      { method: 'By.name', selector: 'pass', line: 3 },
    ])
  })
})

describe('class-index + unresolvedBases (R2 steps 2-3)', () => {
  it('extractor emits class name + superclass', () => {
    const { classes } = run('class LoginPage extends BasePage { }')
    expect(classes).toEqual([{ name: 'LoginPage', superclass: 'BasePage', file: 'T.java', line: 1 }])
  })

  it('class without extends -> superclass null', () => {
    const { classes } = run('class Plain { }')
    expect(classes?.[0]).toMatchObject({ name: 'Plain', superclass: null })
  })

  it('analyze: base present in scan -> no unresolvedBases', () => {
    const report = analyze([
      { path: 'LoginPage.java', text: 'class LoginPage extends BasePage { @FindBy(id="u") Object u; }' },
      { path: 'BasePage.java', text: 'class BasePage { @FindBy(id="b") Object b; }' },
    ])
    expect(report.summary.unresolvedBases).toBeUndefined()
  })

  it('analyze: base outside scan -> flagged', () => {
    const report = analyze([
      { path: 'LoginPage.java', text: 'class LoginPage extends BasePage { @FindBy(id="u") Object u; }' },
    ])
    expect(report.summary.unresolvedBases).toEqual([{ className: 'LoginPage', base: 'BasePage' }])
  })
})

describe('Selenide + @FindBys (R3)', () => {
  it('$("css") -> By.cssSelector', () => {
    const { locators } = run('class T { void t(){ $(".btn").click(); } }')
    expect(locators).toEqual([{ method: 'By.cssSelector', selector: '.btn', line: 1 }])
  })

  it('$x("xpath") -> By.xpath', () => {
    const { locators } = run('class T { void t(){ $x("//div[3]/a").click(); } }')
    expect(locators).toEqual([{ method: 'By.xpath', selector: '//div[3]/a', line: 1 }])
  })

  it('$$(".item") collection -> By.cssSelector', () => {
    const { locators } = run('class T { void t(){ $$(".item").first(); } }')
    expect(locators).toEqual([{ method: 'By.cssSelector', selector: '.item', line: 1 }])
  })

  it('$(By.id("x")) -> only the By, no Selenide duplicate', () => {
    const { locators } = run('class T { void t(){ $(By.id("x")).click(); } }')
    expect(locators).toEqual([{ method: 'By.id', selector: 'x', line: 1 }])
  })

  it('$(variable) -> dynamic', () => {
    const { locators } = run('class T { void t(){ $(sel).click(); } }')
    expect(locators.map(l => [l.method, l.selector])).toEqual([['By.cssSelector', null]])
  })

  it('@FindBys extracts its component @FindBy locators', () => {
    const { locators } = run('class P { @FindBys({@FindBy(id = "a"), @FindBy(css = ".b")}) Object c; }')
    expect(locators).toEqual([
      { method: 'By.id', selector: 'a', line: 1 },
      { method: 'By.cssSelector', selector: '.b', line: 1 },
    ])
  })
})
