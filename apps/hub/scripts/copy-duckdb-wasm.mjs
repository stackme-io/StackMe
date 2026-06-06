import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dst = resolve(__dirname, '../public/duckdb')

// Ищем пакет: сначала в hub/node_modules (Vercel), потом в корне монорепо (локально/hoisted)
const candidates = [
  resolve(__dirname, '../node_modules/@duckdb/duckdb-wasm/dist'),
  resolve(__dirname, '../../../node_modules/@duckdb/duckdb-wasm/dist'),
]
const src = candidates.find(existsSync)
if (!src) {
  console.error('❌ @duckdb/duckdb-wasm not found in:', candidates)
  process.exit(1)
}

if (!existsSync(dst)) mkdirSync(dst, { recursive: true })

// MVP bundle only — eh and coi bundles are not used
const MVP_FILES = [
  'duckdb-mvp.wasm',
  'duckdb-browser-mvp.worker.js',
]

MVP_FILES.forEach(f => {
  const srcFile = `${src}/${f}`
  if (!existsSync(srcFile)) {
    console.error(`❌ Missing: ${f}`)
    process.exit(1)
  }
  copyFileSync(srcFile, `${dst}/${f}`)
  console.log(`✓ ${f}`)
})

console.log('Done — DuckDB MVP bundle copied to public/duckdb/')
