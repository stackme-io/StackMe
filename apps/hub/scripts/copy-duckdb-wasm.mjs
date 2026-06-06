import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = resolve(__dirname, '../../../node_modules/@duckdb/duckdb-wasm/dist')
const dst = resolve(__dirname, '../public/duckdb')

if (!existsSync(dst)) mkdirSync(dst, { recursive: true })

const allFiles = readdirSync(src)
const files = allFiles.filter(f => f.endsWith('.wasm') || f.endsWith('.worker.js'))

files.forEach(f => {
  copyFileSync(`${src}/${f}`, `${dst}/${f}`)
  console.log(`✓ ${f}`)
})

console.log('Done — DuckDB WASM files copied to public/duckdb/')
