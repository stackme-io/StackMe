import * as duckdb from '@duckdb/duckdb-wasm'

// DuckDB bundles served locally (copied by scripts/copy-duckdb-wasm.mjs).
// We force the MVP bundle only — the EH (Exception Handling) bundle triggers
// a WASM "function signature mismatch" on the first runQuery when served
// from Service Worker cache offline. MVP avoids WebAssembly EH entirely.
const LOCAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: '/duckdb/duckdb-mvp.wasm',
    mainWorker: '/duckdb/duckdb-browser-mvp.worker.js',
  },
}

let db:   duckdb.AsyncDuckDB           | null = null
let conn: duckdb.AsyncDuckDBConnection | null = null
let initPromise: Promise<void>         | null = null

async function initDuckDB(): Promise<void> {
  const bundle = await duckdb.selectBundle(LOCAL_BUNDLES)
  if (!bundle.mainWorker) throw new Error('No mainWorker in DuckDB bundle')

  // Direct Worker from the main thread — SW-interceptable, no nesting
  const worker = new Worker(bundle.mainWorker, { type: 'classic' })
  const logger = new duckdb.VoidLogger()

  db = new duckdb.AsyncDuckDB(logger, worker)
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  conn = await db.connect()
}

function ensureInit(): Promise<void> {
  if (!initPromise) initPromise = initDuckDB()
  return initPromise
}

function csvToJson(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

export async function loadCSV(csvText: string, tableName: string): Promise<void> {
  await ensureInit()
  if (!db || !conn) throw new Error('DuckDB not initialized')

  const json  = JSON.stringify(csvToJson(csvText))
  const bytes = new TextEncoder().encode(json)

  await conn.query(`DROP TABLE IF EXISTS ${tableName}`)
  await db.registerFileBuffer(`${tableName}.json`, bytes)
  await conn.query(
    `CREATE TABLE ${tableName} AS SELECT * FROM read_json_auto('${tableName}.json')`
  )
}

export async function loadJSON(jsonData: string, tableName: string): Promise<void> {
  await ensureInit()
  if (!db || !conn) throw new Error('DuckDB not initialized')

  const bytes = new TextEncoder().encode(jsonData)

  await conn.query(`DROP TABLE IF EXISTS ${tableName}`)
  await db.registerFileBuffer(`${tableName}.json`, bytes)
  await conn.query(
    `CREATE TABLE ${tableName} AS SELECT * FROM read_json_auto('${tableName}.json')`
  )
}

export async function runQuery(sql: string): Promise<any[]> {
  await ensureInit()
  if (!conn) throw new Error('DuckDB not initialized')

  const result = await conn.query(sql)
  return result.toArray().map((row: any) => row.toJSON())
}

export async function loadAnomalyIndex(anomalyRowIndexes: number[]): Promise<void> {
  const jsonData = JSON.stringify(anomalyRowIndexes.map(i => ({ row_index: i })))
  await loadJSON(jsonData, 'anomaly_index')
}
