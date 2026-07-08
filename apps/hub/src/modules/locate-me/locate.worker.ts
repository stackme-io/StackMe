// LocateMe analysis worker - runs the engine off the main thread so large
// suites don't freeze the UI. Same core as the CLI (@locateme/core).
//
// Java (Selenium) needs the tree-sitter wasm parser. We init it lazily IN THE WORKER
// (only when the scan contains .java) and register the extractor into this worker's
// analyze() instance before running - so Selenium/Java parsing also stays off the
// main thread.
import { analyze, registerJavaExtractor } from '@locateme/core/analyze'
import { detectStack } from '@locateme/core/detect'
import type { SourceFileInput } from '@locateme/core/types'
import { getJavaParser } from '../../java/parser'
import { JavaTreeSitterExtractor } from '../../java/extractor'

interface Req {
  files: SourceFileInput[]
  target: string
}

let javaReady = false

self.onmessage = async (e: MessageEvent<Req>) => {
  const { files, target } = e.data
  try {
    if (!javaReady && files.some(f => /\.java$/i.test(f.path))) {
      const parser = await getJavaParser()
      registerJavaExtractor(new JavaTreeSitterExtractor(parser))
      javaReady = true
    }
    const report = analyze(files, target)
    const detection = detectStack(files)
    ;(self as unknown as Worker).postMessage({ ok: true, report, detection })
  } catch (err) {
    ;(self as unknown as Worker).postMessage({ ok: false, error: (err as Error).message })
  }
}
