import { describe, it, expect } from 'vitest'
import { classify } from '@locateme/core/classify'

// Step 5 gate: Selenium By.* -> kind, driven through the classify() router
// (method "By.<strategy>"). No wasm, no extractor - pure classification table.
// xpath/css reuse the existing shape classifiers; direct strategies map by target.
const cases: Array<[string, string | null, string, string | undefined]> = [
  // method,               selector,                     kind,       subcause
  ['By.id',              'username',                    'stable',   'selenium-id'],
  ['By.id',              'radix-9',                     'fragile',  'selenium-id-generated'],
  ['By.name',            'email',                       'stable',   'selenium-name'],
  ['By.cssSelector',     '.list li:nth-child(2)',       'fragile',  'css-positional'],
  ['By.cssSelector',     '[data-testid=save]',          'stable',   'css-testattr'],
  ['By.cssSelector',     '#login',                      'stable',   'css-id'],
  ['By.xpath',           '//div[3]/button',             'fragile',  'xpath-positional'],
  ['By.xpath',           "//button[@id='checkout']",    'stable',   'xpath-id'],
  ['By.xpath',           "//a[text()='Logout']",        'context',  'xpath-text'],
  ['By.className',       'btn-primary',                 'context',  'selenium-classname'],
  ['By.tagName',         'input',                       'context',  'selenium-tagname'],
  ['By.linkText',        'Logout',                      'context',  'selenium-linktext'],
  ['By.partialLinkText', 'Log',                         'context',  'selenium-partiallinktext'],
  ['By.xpath',           null,                          'dynamic',  undefined],
  ['By.ByChained',       'x',                           'dynamic',  undefined],
]

describe('classifySelenium (via classify router)', () => {
  for (const [method, selector, kind, subcause] of cases) {
    it(`${method}(${JSON.stringify(selector)}) -> ${kind}${subcause ? '/' + subcause : ''}`, () => {
      const r = classify(method, selector)
      expect(r.kind).toBe(kind)
      if (subcause) expect(r.subcause).toBe(subcause)
    })
  }
})

describe('Selenium prefer wording (no Playwright idioms)', () => {
  const shouldHaveSeleniumPrefer: Array<[string, string]> = [
    ['By.xpath', '//div[3]/button'],          // xpath-positional
    ['By.xpath', '//ul/following-sibling::a'], // xpath-axis
    ['By.cssSelector', '.list li:nth-child(2)'], // css-positional
    ['By.cssSelector', 'div.css-1a2b3c'],      // css-autoclass
  ]
  for (const [method, selector] of shouldHaveSeleniumPrefer) {
    it(`${method}(${JSON.stringify(selector)}) prefer avoids getBy*`, () => {
      const r = classify(method, selector)
      expect(r.prefer).toBeTruthy()
      expect(r.prefer).not.toMatch(/getBy/)
    })
  }
})
