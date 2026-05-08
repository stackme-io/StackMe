import { useState, useCallback } from 'react'
import { loadCSV, runQuery } from '../../shared/analytics'
import type { AnomalyInfo, AnalyzeResult } from './types'
import { AnomalyTable } from './AnomalyTable'

export function AnalyzeSection() {
  const [result, setResult]       = useState<AnalyzeResult | null>(null)
  const [tableData, setTableData] = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const analyze = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const text = await file.text()
      await loadCSV(text, 'analyze_data')

      const rowCountResult = await runQuery('SELECT COUNT(*) as cnt FROM analyze_data')
      const rows_total = Number(rowCountResult[0]?.cnt ?? 0)

      const anomalies: AnomalyInfo[] = []

      // Get columns
      const columns = await runQuery(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'analyze_data'
        ORDER BY ordinal_position
      `)
      const colNames = columns.map((c: any) => c.column_name as string)

      // Add row_index to table
      await runQuery(`
        CREATE OR REPLACE TABLE analyze_data_indexed AS
        SELECT ROW_NUMBER() OVER () - 1 AS _row_index, *
        FROM analyze_data
      `)

      const rows = await runQuery('SELECT * FROM analyze_data_indexed')
      setTableData(rows)

      // Detect nulls per column
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

      // Detect duplicates — find rows where all non-index columns match a previous row
      const colList = colNames.map(c => `"${c}"`).join(', ')
      const dupRows = await runQuery(`
        WITH grouped AS (
          SELECT ${colList}, MIN(_row_index) as first_seen, COUNT(*) as cnt
          FROM analyze_data_indexed
          GROUP BY ${colList}
          HAVING COUNT(*) > 1
        )
        SELECT i._row_index
        FROM analyze_data_indexed i
        JOIN grouped g ON (${colNames.map(c => `i."${c}" = g."${c}"`).join(' AND ')})
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

      // Detect outliers — IQR method on numeric columns
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
    }
  }, [])

  return (
    <div>
      <div
        onClick={() => document.getElementById('analyze-file-input')?.click()}
        className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/30 hover:bg-muted/20 transition-colors"
      >
        <input
          id="analyze-file-input"
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) analyze(f) }}
        />
        <p className="text-sm text-foreground">
          {loading ? 'Analyzing...' : 'drop your CSV here or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground">no data leaves your browser</p>
      </div>

      {error && (
        <div className="mt-3 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex gap-4 px-4 py-3 rounded-lg bg-muted/50 border border-border text-sm">
            <span className="text-muted-foreground">
              rows: <strong className="text-foreground">{result.rows_total}</strong>
            </span>
            <span className="text-muted-foreground">
              anomalies: <strong className="text-foreground">{result.anomalies_count}</strong>
            </span>
          </div>

          <AnomalyTable tableData={tableData} anomalies={result.anomalies} />
        </div>
      )}
    </div>
  )
}