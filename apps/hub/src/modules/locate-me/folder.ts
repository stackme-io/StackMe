// Folder input via the File System Access API (Chromium browsers).
// Recursively reads .ts files, skipping vendored / build dirs — mirrors the CLI walk.
import type { SourceFileInput } from '@locateme/core/types'

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'coverage', '.git', '.next', '.turbo', '.cache',
])

export interface FolderScan {
  files: SourceFileInput[]
  rootName: string
}

export function supportsFolderPicker(): boolean {
  return typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'
}

export async function pickAndReadFolder(): Promise<FolderScan> {
  const dir = await (window as unknown as { showDirectoryPicker: () => Promise<unknown> }).showDirectoryPicker()
  const files: SourceFileInput[] = []
  await walk(dir, '', files)
  return { files, rootName: (dir as { name: string }).name }
}

async function walk(dir: unknown, prefix: string, out: SourceFileInput[]): Promise<void> {
  const handle = dir as { values: () => AsyncIterable<FsHandle> }
  for await (const entry of handle.values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.kind === 'directory') {
      if (SKIP_DIRS.has(entry.name)) continue
      await walk(entry, path, out)
    } else if (entry.name.endsWith('.ts')) {
      const file = await entry.getFile()
      out.push({ path, text: await file.text() })
    }
  }
}

interface FsHandle {
  kind: 'file' | 'directory'
  name: string
  values: () => AsyncIterable<FsHandle>
  getFile: () => Promise<{ text: () => Promise<string> }>
}
