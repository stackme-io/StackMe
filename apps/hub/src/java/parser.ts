// web-tree-sitter Java parser. Pinned to web-tree-sitter@0.20.8 to match the prebuilt
// grammars in tree-sitter-wasms (0.25+ uses a dylink loader that rejects them).
// The init is injectable so the same code runs in the browser (locateFile -> /wasm)
// and in a Node test (locateFile -> a filesystem path).

import Parser from 'web-tree-sitter'

export interface JavaParserInit {
  locateFile: (name: string) => string // where the core tree-sitter.wasm lives
  grammarPath: string                  // path/URL to tree-sitter-java.wasm
}

export async function initJavaParser(init: JavaParserInit): Promise<Parser> {
  await Parser.init({ locateFile: init.locateFile })
  const Java = await Parser.Language.load(init.grammarPath)
  const parser = new Parser()
  parser.setLanguage(Java)
  return parser
}

// Browser singleton: wasm served from /wasm (copy-treesitter-wasm.mjs at build).
let browserParser: Promise<Parser> | null = null
export function getJavaParser(): Promise<Parser> {
  if (!browserParser) {
    browserParser = initJavaParser({
      locateFile: (name) => `/wasm/${name}`,
      grammarPath: '/wasm/tree-sitter-java.wasm',
    })
  }
  return browserParser
}

/** Spike helper (step 1): parse Java to an S-expression. Still handy for debugging. */
export async function parseJavaToSexp(source: string): Promise<string> {
  const parser = await getJavaParser()
  return parser.parse(source).rootNode.toString()
}
