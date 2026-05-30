import { runQuery } from '../../../shared/analytics'
import type { AnomalyInfo } from '../types'

export async function detectDuplicates(colNames: string[]): Promise<AnomalyInfo[]> {
  const anomalies: AnomalyInfo[] = []
  const castCols = colNames.map(c => `CAST("${c}" AS VARCHAR)`).join(' || \'|\' || ')
  const rows = await runQuery(`
    WITH grouped AS (
      SELECT ${castCols} AS _row_key,
             MIN(_row_index) AS first_seen
      FROM analyze_data_indexed
      GROUP BY _row_key
      HAVING COUNT(*) > 1
    )
    SELECT i._row_index
    FROM analyze_data_indexed i
    JOIN grouped g ON (${castCols}) = g._row_key
    WHERE i._row_index > g.first_seen
  `)
  for (const row of rows) {
    anomalies.push({
      row_index:      Number(row._row_index),
      column:         '*',
      anomaly_type:   'duplicate',
      original_value: '',
      description:    'Duplicate row detected',
    })
  }
  return anomalies
}