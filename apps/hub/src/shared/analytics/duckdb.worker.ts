import * as duckdb from '@duckdb/duckdb-wasm'

let db: duckdb.AsyncDuckDB | null = null
let conn: duckdb.AsyncDuckDBConnection | null = null

async function initDuckDB() {
  const LOCAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
      mainModule: '/duckdb/duckdb-mvp.wasm',
      mainWorker: '/duckdb/duckdb-browser-mvp.worker.js',
    },
    eh: {
      mainModule: '/duckdb/duckdb-eh.wasm',
      mainWorker: '/duckdb/duckdb-browser-eh.worker.js',
    },
  }
  const bundle = await duckdb.selectBundle(LOCAL_BUNDLES)

  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], {
      type: 'text/javascript',
    })
  )

  const worker = new Worker(worker_url)
  const logger = new duckdb.VoidLogger()

  db = new duckdb.AsyncDuckDB(logger, worker)
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  conn = await db.connect()

  self.postMessage({ type: 'READY' })
}

self.onmessage = async (event) => {
  const { type, id, sql, jsonData, tableName } = event.data

  if (type === 'INIT') {
    await initDuckDB()
    return
  }

  if (type === 'LOAD_JSON') {
    try {
      if (!conn || !db) throw new Error('DuckDB не инициализирован')

      // Удаляем таблицу если уже существует
      await conn.query(`DROP TABLE IF EXISTS ${tableName}`)

      // Загружаем JSON как файл в виртуальную ФС DuckDB
      const encoder = new TextEncoder()
      const bytes = encoder.encode(jsonData)
      await db.registerFileBuffer(`${tableName}.json`, bytes)

      // Создаём таблицу из JSON
      await conn.query(
        `CREATE TABLE ${tableName} AS SELECT * FROM read_json_auto('${tableName}.json')`
      )

      self.postMessage({ type: 'LOAD_DONE', id })
    } catch (error: any) {
      self.postMessage({ type: 'LOAD_ERROR', id, error: error.message })
    }
    return
  }

  if (type === 'QUERY') {
    try {
      if (!conn) throw new Error('DuckDB не инициализирован')
      const result = await conn.query(sql)
      self.postMessage({
        type: 'QUERY_RESULT',
        id,
        data: result.toArray().map((row: any) => row.toJSON()),
      })
    } catch (error: any) {
      self.postMessage({ type: 'QUERY_ERROR', id, error: error.message })
    }
  }
}