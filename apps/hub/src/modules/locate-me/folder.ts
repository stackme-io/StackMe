// Folder input via the File System Access API (Chromium browsers).
// Recursively reads .ts files, skipping vendored / build dirs - mirrors the CLI walk.
import type { SourceFileInput } from '@locateme/core/types'

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'coverage', '.git', '.next', '.turbo', '.cache',
])

// Code files we cannot read yet (other languages / flavors). Counted so we can be
// honest that they were left out of the scan - LocateMe parses Playwright / TS only.
const SKIPPED_CODE_EXT = ['.tsx', '.js', '.jsx', '.mjs', '.cjs', '.java', '.py', '.cs', '.rb']

export interface FolderScan {
  files: SourceFileInput[]
  rootName: string
  skipped: number
}

export function supportsFolderPicker(): boolean {
  return typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'
}

export async function pickAndReadFolder(): Promise<FolderScan> {
  const dir = await (window as unknown as { showDirectoryPicker: () => Promise<unknown> }).showDirectoryPicker()
  const files: SourceFileInput[] = []
  const stats = { skipped: 0 }
  await walk(dir, '', files, stats)
  return { files, rootName: (dir as { name: string }).name, skipped: stats.skipped }
}

async function walk(dir: unknown, prefix: string, out: SourceFileInput[], stats: { skipped: number }): Promise<void> {
  const handle = dir as { values: () => AsyncIterable<FsHandle> }
  for await (const entry of handle.values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.kind === 'directory') {
      if (SKIP_DIRS.has(entry.name)) continue
      await walk(entry, path, out, stats)
    } else if (entry.name.endsWith('.ts')) {
      const file = await entry.getFile()
      out.push({ path, text: await file.text() })
    } else if (SKIPPED_CODE_EXT.some(ext => entry.name.endsWith(ext))) {
      stats.skipped++
    }
  }
}

interface FsHandle {
  kind: 'file' | 'directory'
  name: string
  values: () => AsyncIterable<FsHandle>
  getFile: () => Promise<{ text: () => Promise<string> }>
}
