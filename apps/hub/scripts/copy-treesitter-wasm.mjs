import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Copies the tree-sitter runtime + Java grammar wasm into public/wasm so they are
// served at /wasm/*.wasm (absolute path works in dev AND on Vercel static). Mirrors
// copy-duckdb-wasm.mjs. Runs at build time; tree-sitter-wasms is a devDependency.

const __dirname = dirname(fileURLToPath(import.meta.url))
const dst = resolve(__dirname, '../public/wasm')
if (!existsSync(dst)) mkdirSync(dst, { recursive: true })

function find(candidates, label) {
  const hit = candidates.map(c => resolve(__dirname, c)).find(existsSync)
  if (!hit) {
    console.error(`❌ ${label} not found in:`, candidates)
    process.exit(1)
  }
  return hit
}

// hub/node_modules (Vercel) first, then monorepo root (hoisted/local).
// web-tree-sitter >=0.25 names its core wasm "web-tree-sitter.wasm".
const core = find([
  '../node_modules/web-tree-sitter/web-tree-sitter.wasm',
  '../../../node_modules/web-tree-sitter/web-tree-sitter.wasm',
], 'web-tree-sitter/web-tree-sitter.wasm')

const java = find([
  '../node_modules/tree-sitter-wasms/out/tree-sitter-java.wasm',
  '../../../node_modules/tree-sitter-wasms/out/tree-sitter-java.wasm',
], 'tree-sitter-wasms/out/tree-sitter-java.wasm')

// Keep the runtime's expected name (locateFile requests "web-tree-sitter.wasm").
copyFileSync(core, `${dst}/web-tree-sitter.wasm`)
console.log('✓ web-tree-sitter.wasm')
copyFileSync(java, `${dst}/tree-sitter-java.wasm`)
console.log('✓ tree-sitter-java.wasm')
console.log('Done — tree-sitter wasm copied to public/wasm/')
