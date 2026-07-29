import { describe, it, expect } from 'vitest'
import { isParseable, isSkippedCode, isSkipDir } from './folder'

// The folder-scan extension policy: which files get analyzed, which are counted in the
// "N other code files skipped" note, and which are ignored as assets. Verified manually
// against Testing/skip-test2 (4 analyzed, 7 skipped, node_modules + .d.ts + assets out);
// this locks that behaviour so a stray edit to the extension lists is caught.

describe('isParseable (analyzed by the engine)', () => {
  const yes = ['a.ts', 'a.tsx', 'a.js', 'a.jsx', 'a.mjs', 'a.cjs', 'a.mts', 'a.cts', 'Page.java']
  for (const n of yes) it(`parses ${n}`, () => expect(isParseable(n)).toBe(true))

  const no = ['types.d.ts', 'script.py', 'styles.css', 'data.json', 'README.md', 'logo.png', 'Program.cs']
  for (const n of no) it(`does not parse ${n}`, () => expect(isParseable(n)).toBe(false))
})

describe('isSkippedCode (counted in the skipped note)', () => {
  const yes = ['script.py', 'Program.cs', 'app.rb', 'main.go', 'index.php', 'Main.kt', 'App.swift']
  for (const n of yes) it(`counts ${n}`, () => expect(isSkippedCode(n)).toBe(true))

  // Analyzed files and assets are NOT counted as skipped code.
  const no = ['a.ts', 'a.js', 'Page.java', 'styles.css', 'data.json', 'README.md', 'logo.png', 'types.d.ts']
  for (const n of no) it(`does not count ${n}`, () => expect(isSkippedCode(n)).toBe(false))
})

describe('categories are mutually exclusive', () => {
  // Every file is at most one of: parseable | skipped-code | ignored. Never both.
  const names = [
    'a.ts', 'Page.java', 'types.d.ts', 'script.py', 'App.swift',
    'styles.css', 'data.json', 'README.md', 'logo.png',
  ]
  for (const n of names) {
    it(`${n} is not both parseable and skipped-code`, () => {
      expect(isParseable(n) && isSkippedCode(n)).toBe(false)
    })
  }
})

describe('isSkipDir (vendored / build dirs)', () => {
  const yes = ['node_modules', 'dist', 'build', 'coverage', '.git', '.next', '.turbo', '.cache']
  for (const n of yes) it(`skips ${n}/`, () => expect(isSkipDir(n)).toBe(true))

  const no = ['src', 'tests', 'e2e', 'pages', 'app']
  for (const n of no) it(`descends ${n}/`, () => expect(isSkipDir(n)).toBe(false))
})
