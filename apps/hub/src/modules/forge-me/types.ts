export type DataFormat = 'json' | 'csv' | 'sql'
export type FilterMode = 'all' | 'anomalies'

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

export const inputStyle = {
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '14px',
  background: '#fff',
  color: '#111827',
}

export function csvToJson(csv: string): Record<string, any>[] {
  const lines = csv.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/\r/g, ''))
    const obj: Record<string, any> = {}
    headers.forEach((h, i) => {
      const val = values[i]
      if (val === '' || val === undefined) {
        obj[h] = null
      } else if (!isNaN(Number(val))) {
        obj[h] = Number(val)
      } else {
        obj[h] = val
      }
    })
    return obj
  })
}
