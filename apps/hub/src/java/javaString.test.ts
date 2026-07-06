import { describe, it, expect } from 'vitest'
import { decodeJavaString, decodeJavaTextBlock } from '@locateme/core/javaString'

// Step 6 gate: Java string-literal decoding. Left column is the RAW inner text as
// tree-sitter hands it to us (escapes intact); right is the decoded value we feed to
// the classifiers. JS escaping note: '\\' below is a single backslash at runtime.
describe('decodeJavaString', () => {
  const cases: Array<[string, string]> = [
    ['//*[@class=\\"foo\\"]', '//*[@class="foo"]'], // \" -> "
    ['a\\\\b', 'a\\b'],                              // \\ -> \
    ['tab\\tend', 'tab\tend'],                       // \t
    ['\\u0041', 'A'],                                // unicode
    ['\\uuu0041', 'A'],                              // multiple u
    ['\\101', 'A'],                                  // octal 101 = 65 = A
    ["it\\'s", "it's"],                              // \'
    ['plain-selector', 'plain-selector'],            // no escapes
  ]
  for (const [raw, want] of cases) {
    it(JSON.stringify(raw), () => expect(decodeJavaString(raw)).toBe(want))
  }
})

describe('decodeJavaTextBlock', () => {
  it('strips incidental indent and closing delimiter line', () => {
    const raw = '"""\n    //div\n    //span\n    """'
    expect(decodeJavaTextBlock(raw)).toBe('//div\n//span')
  })
})
