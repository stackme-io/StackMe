// SPIKE (step 1): prove web-tree-sitter + tree-sitter-java.wasm parse Java in the
// browser, in dev AND on a deployed Vercel preview. Lazy: nothing loads until the
// first call, so web-tree-sitter stays out of the main bundle. Not wired into
// analyze() yet - this only de-risks the WASM-in-prod path.
//
// Targets web-tree-sitter ^0.25 (named exports Parser/Language). If your installed
// version differs and the import/API errors, paste the error and we adjust.

import { Parser, Language } from 'web-tree-sitter'

const WASM_BASE = '/wasm'
let ready: Promise<Parser> | null = null

async function getParser(): Promise<Parser> {
  if (!ready) {
    ready = (async () => {
      // locateFile tells the emscripten runtime where tree-sitter.wasm lives.
      await Parser.init({ locateFile: (name: string) => `${WASM_BASE}/${name}` })
      const Java = await Language.load(`${WASM_BASE}/tree-sitter-java.wasm`)
      const parser = new Parser()
      parser.setLanguage(Java)
      return parser
    })()
  }
  return ready
}

/** Parse Java source, return the tree as an S-expression (spike verification). */
export async function parseJavaToSexp(source: string): Promise<string> {
  const parser = await getParser()
  const tree = parser.parse(source)
  if (!tree) throw new Error('tree-sitter returned no tree')
  return tree.rootNode.toString()
}
