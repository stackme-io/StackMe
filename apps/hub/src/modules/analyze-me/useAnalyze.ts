import { useState, useCallback } from 'react'
import { loadCSV, runQuery } from '../../shared/analytics'
import type { AnomalyInfo, AnalyzeResult } from './types'

const SIZE_WARN_MB  = 10
const SIZE_LIMIT_MB = 50

export function useAnalyze() {
  const [result, setResult]       = useState<AnalyzeResult | null>(null)
  const [tableData, setTableData] = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [progress, setProgress]   = useState<string | null>(null)
  const [sizeWarn, setSizeWarn]   = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const analyze = useCallback(async (file: File) => {
    const sizeMB = file.size / (1024 * 1024)

    if (sizeMB > SIZE_LIMIT_MB) {
      setError(`File is too large (${sizeMB.toFixed(1)} MB). Maximum allowed size is ${SIZE_LIMIT_MB} MB.`)
      return
    }

    setSizeWarn(sizeMB > SIZE_WARN_MB)
    setLoading(true)
    setProgress('Reading file...')
    setError(null)
    setResult(null)

    try {
      const text = await file.text()

      setProgress('Loading into DuckDB...')
      await loadCSV(text, 'analyze_data')

      const rowCountResult = await runQuery('SELECT COUNT(*) as cnt FROM analyze_data')
      const rows_total = Number(rowCountResult[0]?.cnt ?? 0)

      const anomalies: AnomalyInfo[] = []

      setProgress('Reading columns...')
      const columns = await runQuery(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'analyze_data'
        ORDER BY ordinal_position
      `)
      const colNames = columns.map((c: any) => c.column_name as string)

      await runQuery(`
        CREATE OR REPLACE TABLE analyze_data_indexed AS
        SELECT ROW_NUMBER() OVER () - 1 AS _row_index, *
        FROM analyze_data
      `)

      const rows = await runQuery('SELECT * FROM analyze_data_indexed')
      setTableData(rows)

      setProgress('Detecting nulls...')
      for (const col of colNames) {
        const nullRows = await runQuery(`
          SELECT _row_index
          FROM analyze_data_indexed
          WHERE "${col}" IS NULL OR CAST("${col}" AS VARCHAR) = ''
        `)
        for (const row of nullRows) {
          anomalies.push({
            row_index: Number(row._row_index),
            column: col,
            anomaly_type: 'missing',
            original_value: '',
            description: `Null or empty value in column "${col}"`,
          })
        }
      }

      setProgress('Detecting duplicates...')
      const dupRows = await runQuery(`
        WITH grouped AS (
          SELECT ${colNames.map(c => `CAST("${c}" AS VARCHAR)`).join(' || \'|\' || ')} as _row_key,
                 MIN(_row_index) as first_seen
          FROM analyze_data_indexed
          GROUP BY _row_key
          HAVING COUNT(*) > 1
        )
        SELECT i._row_index
        FROM analyze_data_indexed i
        JOIN grouped g ON (
          ${colNames.map(c => `CAST(i."${c}" AS VARCHAR)`).join(' || \'|\' || ')} = g._row_key
        )
        WHERE i._row_index > g.first_seen
      `)
      for (const row of dupRows) {
        anomalies.push({
          row_index: Number(row._row_index),
          column: '*',
          anomaly_type: 'duplicate',
          original_value: '',
          description: 'Duplicate row detected',
        })
      }

      setProgress('Detecting outliers...')
      for (const col of colNames) {
        const stats = await runQuery(`
          SELECT
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY CAST("${col}" AS DOUBLE)) as q1,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY CAST("${col}" AS DOUBLE)) as q3
          FROM analyze_data_indexed
          WHERE TRY_CAST("${col}" AS DOUBLE) IS NOT NULL
        `)
        if (!stats[0] || stats[0].q1 == null) continue
        const q1  = Number(stats[0].q1)
        const q3  = Number(stats[0].q3)
        const iqr = q3 - q1
        if (iqr === 0) continue
        const lower = q1 - 3 * iqr
        const upper = q3 + 3 * iqr

        const outlierRows = await runQuery(`
          SELECT _row_index, CAST("${col}" AS DOUBLE) as val
          FROM analyze_data_indexed
          WHERE TRY_CAST("${col}" AS DOUBLE) IS NOT NULL
            AND (CAST("${col}" AS DOUBLE) < ${lower} OR CAST("${col}" AS DOUBLE) > ${upper})
        `)
        for (const row of outlierRows) {
          anomalies.push({
            row_index: Number(row._row_index),
            column: col,
            anomaly_type: 'outlier',
            original_value: String(row.val),
            description: `Outlier detected in column "${col}" (value: ${row.val}, expected range: ${lower.toFixed(2)}–${upper.toFixed(2)})`,
          })
        }
      }

      anomalies.sort((a, b) => a.row_index - b.row_index)
      setResult({ rows_total, anomalies_count: anomalies.length, anomalies })
    } catch (err: any) {
      console.error(err)
      setError('Failed to analyze file. Make sure it is a valid CSV.')
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }, [])

  return { result, tableData, loading, progress, sizeWarn, error, analyze }
}