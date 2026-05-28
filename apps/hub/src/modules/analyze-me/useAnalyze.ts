import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { loadCSV, loadJSON, runQuery } from '../../shared/analytics'
import type { AnomalyInfo, AnalyzeResult } from './types'

const SIZE_WARN_MB  = 10
const SIZE_LIMIT_MB = 50

export function useAnalyze() {
  const { t } = useTranslation()

  const [result, setResult]       = useState<AnalyzeResult | null>(null)
  const [tableData, setTableData] = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [progress, setProgress]   = useState<string | null>(null)
  const [sizeWarn, setSizeWarn]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [fileName, setFileName]   = useState<string | null>(null)

  const analyze = useCallback(async (file: File) => {
    const sizeMB = file.size / (1024 * 1024)

    if (sizeMB > SIZE_LIMIT_MB) {
      setError(`${t('analyze.errorTooLarge')} (${sizeMB.toFixed(1)} MB). ${t('analyze.errorMaxSize')} ${SIZE_LIMIT_MB} MB.`)
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['csv', 'json'].includes(ext)) {
      setError(`${t('analyze.errorUnsupportedType')} ".${ext ?? '?'}". Please upload a CSV or JSON file.`)
      return
    }

    setSizeWarn(sizeMB > SIZE_WARN_MB)
    setFileName(file.name)
    setLoading(true)
    setProgress(t('analyze.progressReading'))
    setError(null)
    setResult(null)

    try {
      let text: string

      try {
        text = await file.text()
      } catch {
        throw new Error(t('analyze.errorEncoding'))
      }

      if (!text.trim()) {
        throw new Error(t('analyze.errorEmpty'))
      }

      if (ext === 'csv') {
        const lines = text.trim().split('\n').filter(l => l.trim())
        if (lines.length < 2) {
          throw new Error(t('analyze.errorMinRows'))
        }
        const headers = lines[0].split(',').map(h => h.trim()).filter(Boolean)
        if (headers.length === 0) {
          throw new Error(t('analyze.errorNoHeaders'))
        }
      }

      if (ext === 'json') {
        try {
          const parsed = JSON.parse(text)
          if (!Array.isArray(parsed)) {
            throw new Error(t('analyze.errorJsonArray'))
          }
          if (parsed.length === 0) {
            throw new Error(t('analyze.errorJsonEmpty'))
          }
        } catch (e: any) {
          throw new Error(e.message.startsWith('JSON') ? e.message : t('analyze.errorJsonInvalid'))
        }
      }

      setProgress(t('analyze.progressLoading'))
      if (ext === 'json') {
        await loadJSON(text, 'analyze_data')
      } else {
        await loadCSV(text, 'analyze_data')
      }

      const rowCountResult = await runQuery('SELECT COUNT(*) as cnt FROM analyze_data')
      const rows_total = Number(rowCountResult[0]?.cnt ?? 0)

      const anomalies: AnomalyInfo[] = []

      setProgress(t('analyze.progressColumns'))
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

      setProgress(t('analyze.progressNulls'))
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

      setProgress(t('analyze.progressDuplicates'))
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

      setProgress(t('analyze.progressOutliers'))
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
        const lower = q1 - 1.5 * iqr
        const upper = q3 + 1.5 * iqr

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
      setError(err.message ?? t('analyze.errorGeneric'))
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }, [t])

  return { result, tableData, loading, progress, sizeWarn, error, fileName, analyze }
}