export interface AnomalyInfo {
  row_index: number
  column: string
  anomaly_type: 'missing' | 'duplicate' | 'outlier'
  original_value: string
  description: string
}

export interface AnalyzeResult {
  rows_total: number
  anomalies_count: number
  anomalies: AnomalyInfo[]
}

export function csvToJson(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}