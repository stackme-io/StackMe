export type DataFormat = 'json' | 'csv' | 'sql'
export type FilterMode = 'all' | 'anomalies'
export type ViewMode   = 'raw' | 'schema'
export type PresetMode = 'starter' | 'chaos' | null

export type AnomalyType =
  | 'nulls'
  | 'duplicates'
  | 'outliers'
  | 'out-of-order'
  | 'late-arrivals'
  | 'type-mismatches'
  | 'stale-timestamps'

export interface HistoryEntry {
  rows: number
  rate: number
  format: DataFormat
  anomalies: AnomalyType[]
}

export interface AnomalyInfo {
  row_index: number
  column: string
  anomaly_type: string
  original_value: string | null
  description: string
}

export interface GenerateResponse {
  format: DataFormat
  rows_total: number
  anomalies_count: number
  anomalies: AnomalyInfo[]
  data: string
}

export interface AnalyzeResponse {
  rows_total: number
  anomalies_count: number
  anomalies: AnomalyInfo[]
}

export function csvToJson(csv: string): Record<string, any>[] {
  const lines   = csv.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/\r/g, ''))
    const obj: Record<string, any> = {}
    headers.forEach((h, i) => {
      const val = values[i]
      if (val === '' || val === undefined) obj[h] = null
      else if (!isNaN(Number(val)))        obj[h] = Number(val)
      else                                 obj[h] = val
    })
    return obj
  })

export interface SchemaField {
  name: string
  type: 'int' | 'float' | 'timestamp' | 'string'
}