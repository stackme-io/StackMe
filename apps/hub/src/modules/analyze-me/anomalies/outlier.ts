import { runQuery } from '../../../shared/analytics'
import type { AnomalyInfo } from '../types'

export async function detectOutliers(colNames: string[], iqrMultiplier: number): Promise<AnomalyInfo[]> {
  const anomalies: AnomalyInfo[] = []
  for (const col of colNames) {
    const stats = await runQuery(`
      SELECT
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY CAST("${col}" AS DOUBLE)) AS q1,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY CAST("${col}" AS DOUBLE)) AS q3
      FROM analyze_data_indexed
      WHERE TRY_CAST("${col}" AS DOUBLE) IS NOT NULL
    `)
    if (!stats[0] || stats[0].q1 == null) continue
    const q1  = Number(stats[0].q1)
    const q3  = Number(stats[0].q3)
    const iqr = q3 - q1
    if (iqr === 0) continue
    const lower = q1 - iqrMultiplier * iqr
    const upper = q3 + iqrMultiplier * iqr

    const rows = await runQuery(`
      SELECT _row_index, CAST("${col}" AS DOUBLE) AS val
      FROM analyze_data_indexed
      WHERE TRY_CAST("${col}" AS DOUBLE) IS NOT NULL
        AND (CAST("${col}" AS DOUBLE) < ${lower} OR CAST("${col}" AS DOUBLE) > ${upper})
    `)
    for (const row of rows) {
      anomalies.push({
        row_index:      Number(row._row_index),
        column:         col,
        anomaly_type:   'outlier',
        original_value: String(row.val),
        description:    `Outlier in column "${col}" (value: ${row.val}, expected: ${lower.toFixed(2)}–${upper.toFixed(2)})`,
      })
    }
  }
  return anomalies
}