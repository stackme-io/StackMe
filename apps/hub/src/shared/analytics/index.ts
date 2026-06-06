import * as duckdb from '@duckdb/duckdb-wasm'

// Only MVP bundle — EH bundle triggers function signature mismatch when
// served from Service Worker cache offline.
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

  const worker = new Worker(bundle.mainWorker, { type: 'classic' })
  const logger = new duckdb.VoidLogger()

  db = new duckdb.AsyncDuckDB(logger, worker)
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  conn = await db.connect()

  // Disable auto-downloading extensions from extensions.duckdb.org
  // — critical for offline mode. We use read_csv_auto which is built-in.
  await conn.query('SET autoinstall_known_extensions=false')
  await conn.query('SET autoload_known_extensions=false')
}

function ensureInit(): Promise<void> {
  if (!initPromise) initPromise = initDuckDB()
  return initPromise
}

// Convert JSON array to CSV string for DuckDB's built-in read_csv_auto.
// read_json_auto requires the json extension (downloaded from internet) —
// read_csv_auto is part of DuckDB core and works fully offline.
function jsonArrayToCSV(records: Record<string, any>[]): string {
  if (records.length === 0) return ''
  const headers = Object.keys(records[0])
  const escape = (v: any): string => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [
    headers.join(','),
    ...records.map(row => headers.map(h => escape(row[h])).join(',')),
  ].join('\n')
}

async function loadCSVBytes(csvBytes: Uint8Array, tableName: string): Promise<void> {
  if (!db || !conn) throw new Error('DuckDB not initialized')
  await conn.query(`DROP TABLE IF EXISTS "${tableName}"`)
  await db.registerFileBuffer(`${tableName}.csv`, csvBytes)
  await conn.query(
    `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${tableName}.csv')`
  )
}

export async function loadCSV(csvText: string, tableName: string): Promise<void> {
  await ensureInit()
  // Feed raw CSV directly — DuckDB's built-in CSV parser handles quoting,
  // escapes, and type inference natively without any extension.
  await loadCSVBytes(new TextEncoder().encode(csvText), tableName)
}

export async function loadJSON(jsonData: string, tableName: string): Promise<void> {
  await ensureInit()
  const records = JSON.parse(jsonData) as Record<string, any>[]
  const csvText = jsonArrayToCSV(records)
  await loadCSVBytes(new TextEncoder().encode(csvText), tableName)
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
