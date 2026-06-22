// LocateMe analysis worker — runs the engine off the main thread so large
// suites don't freeze the UI. Same core as the CLI (@locateme/core).
import { analyze } from '@locateme/core/analyze'
import { detectStack } from '@locateme/core/detect'
import type { SourceFileInput } from '@locateme/core/types'

interface Req {
  files: SourceFileInput[]
  target: string
}

self.onmessage = (e: MessageEvent<Req>) => {
  const { files, target } = e.data
  try {
    const report = analyze(files, target)
    const detection = detectStack(files)
    ;(self as unknown as Worker).postMessage({ ok: true, report, detection })
  } catch (err) {
    ;(self as unknown as Worker).postMessage({ ok: false, error: (err as Error).message })
  }
}
