type QueryCallback = (data: any[] | null, error?: string) => void
type LoadCallback = (error?: string) => void

const pendingQueries = new Map<string, QueryCallback>()
const pendingLoads = new Map<string, LoadCallback>()

let worker: Worker | null = null
let isReady = false
const readyCallbacks: (() => void)[] = []

function getWorker(): Worker {
  if (worker) return worker

  worker = new Worker(
    new URL('./duckdb.worker.ts', import.meta.url),
    { type: 'module' }
  )

  worker.onmessage = (event) => {
    const { type, id, data, error } = event.data

    if (type === 'READY') {
      isReady = true
      console.log('✓ DuckDB Worker ready')
      readyCallbacks.forEach(cb => cb())
      readyCallbacks.length = 0
      return
    }

    if (type === 'LOAD_DONE') {
      const cb = pendingLoads.get(id)
      if (cb) { cb(); pendingLoads.delete(id) }
      return
    }

    if (type === 'LOAD_ERROR') {
      const cb = pendingLoads.get(id)
      if (cb) { cb(error); pendingLoads.delete(id) }
      return
    }

    if (type === 'QUERY_RESULT') {
      const cb = pendingQueries.get(id)
      if (cb) { cb(data); pendingQueries.delete(id) }
      return
    }

    if (type === 'QUERY_ERROR') {
      const cb = pendingQueries.get(id)
      if (cb) { cb(null, error); pendingQueries.delete(id) }
    }
  }

  worker.postMessage({ type: 'INIT' })
  return worker
}

function waitForReady(): Promise<void> {
  return new Promise((resolve) => {
    if (isReady) { resolve(); return }
    readyCallbacks.push(resolve)
  })
}

export async function loadJSON(jsonData: string, tableName: string): Promise<void> {
  getWorker()
  await waitForReady()

  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID()
    pendingLoads.set(id, (error) => {
      if (error) reject(new Error(error))
      else resolve()
    })
    worker!.postMessage({ type: 'LOAD_JSON', id, jsonData, tableName })
  })
}

export async function runQuery(sql: string): Promise<any[]> {
  getWorker()
  await waitForReady()

  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID()
    pendingQueries.set(id, (data, error) => {
      if (error) reject(new Error(error))
      else resolve(data ?? [])
    })
    worker!.postMessage({ type: 'QUERY', id, sql })
  })
}

export async function loadAnomalyIndex(anomalyRowIndexes: number[]): Promise<void> {
  getWorker()
  await waitForReady()

  const json = JSON.stringify(anomalyRowIndexes.map(i => ({ row_index: i })))

  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID()
    pendingLoads.set(id, (error) => {
      if (error) reject(new Error(error))
      else resolve()
    })
    worker!.postMessage({
      type: 'LOAD_JSON',
      id,
      jsonData: json,
      tableName: 'anomaly_index',
    })
  })
}