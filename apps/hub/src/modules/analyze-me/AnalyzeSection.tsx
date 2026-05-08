import { useState, useCallback } from 'react'
import { loadCSV, runQuery } from '../../shared/analytics'
import type { AnomalyInfo, AnalyzeResult } from './types'
import { AnomalyTable } from './AnomalyTable'

type FilterType = 'all' | 'anomalies' | 'missing' | 'duplicate' | 'outlier'

export function AnalyzeSection() {
  const [result, setResult]       = useState<AnalyzeResult | null>(null)
  const [tableData, setTableData] = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [filter, setFilter]       = useState<FilterType>('all')

  const analyze = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    setResult(null)
    setFilter('all')

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

      // Detect duplicates
      const colList = colNames.map(c => `"${c}"`).join(', ')
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

  const counts = result ? {
    missing:   result.anomalies.filter(a => a.anomaly_type === 'missing').length,
    duplicate: result.anomalies.filter(a => a.anomaly_type === 'duplicate').length,
    outlier:   result.anomalies.filter(a => a.anomaly_type === 'outlier').length,
  } : null

  const anomalyRowIndexes = new Set(result?.anomalies.map(a => a.row_index) ?? [])

  const filteredTableData = filter === 'all'
    ? tableData
    : filter === 'anomalies'
    ? tableData.filter(row => anomalyRowIndexes.has(Number(row._row_index)))
    : tableData.filter(row => {
        const idx = Number(row._row_index)
        return result?.anomalies.some(a => a.row_index === idx && a.anomaly_type === filter)
      })

  const filteredAnomalies = filter === 'all' || filter === 'anomalies'
    ? result?.anomalies ?? []
    : result?.anomalies.filter(a => a.anomaly_type === filter) ?? []

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',       label: 'All rows' },
    { key: 'anomalies', label: 'Anomalies only' },
    { key: 'missing',   label: `Nulls${counts ? ` (${counts.missing})` : ''}` },
    { key: 'duplicate', label: `Duplicates${counts ? ` (${counts.duplicate})` : ''}` },
    { key: 'outlier',   label: `Outliers${counts ? ` (${counts.outlier})` : ''}` },
  ]

  return (
    <div>
      {/* Upload zone */}
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

          {/* Summary */}
          <div className="flex gap-4 px-4 py-3 rounded-lg bg-muted/50 border border-border text-sm">
            <span className="text-muted-foreground">
              rows: <strong className="text-foreground">{result.rows_total}</strong>
            </span>
            <span className="text-muted-foreground">
              anomalies: <strong className="text-foreground">{result.anomalies_count}</strong>
            </span>
            {counts && (
              <>
                <span className="text-red-400/70 text-xs self-center">nulls: <strong>{counts.missing}</strong></span>
                <span className="text-blue-400/70 text-xs self-center">duplicates: <strong>{counts.duplicate}</strong></span>
                <span className="text-amber-400/70 text-xs self-center">outliers: <strong>{counts.outlier}</strong></span>
              </>
            )}
          </div>

          {/* Filters */}
          <div className="flex mb-1">
            <div className="flex border border-border rounded-lg overflow-hidden">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                    filter === f.key
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-muted/30'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <AnomalyTable tableData={filteredTableData} anomalies={filteredAnomalies} />

        </div>
      )}
    </div>
  )
}