import { runQuery } from '../../../shared/analytics'
import type { AnomalyInfo } from '../types'

export async function detectMissing(colNames: string[]): Promise<AnomalyInfo[]> {
  const anomalies: AnomalyInfo[] = []
  for (const col of colNames) {
    const rows = await runQuery(`
      SELECT _row_index
      FROM analyze_data_indexed
      WHERE "${col}" IS NULL OR CAST("${col}" AS VARCHAR) = ''
    `)
    for (const row of rows) {
      anomalies.push({
        row_index:      Number(row._row_index),
        column:         col,
        anomaly_type:   'missing',
        original_value: '',
        description:    `Null or empty value in column "${col}"`,
      })
    }
  }
  return anomalies
}