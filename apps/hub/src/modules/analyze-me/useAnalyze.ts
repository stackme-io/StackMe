import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { loadCSV, loadJSON, runQuery } from '../../shared/analytics'
import { detectMissing, detectDuplicates, detectOutliers } from './anomalies'
import type { AnalyzeResult } from './types'

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

  const analyze = useCallback(async (file: File, iqrMultiplier: number = 1.5) => {
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

      if (!text.trim()) throw new Error(t('analyze.errorEmpty'))

      if (ext === 'csv') {
        const lines = text.trim().split('\n').filter(l => l.trim())
        if (lines.length < 2) throw new Error(t('analyze.errorMinRows'))
        const headers = lines[0].split(',').map(h => h.trim()).filter(Boolean)
        if (headers.length === 0) throw new Error(t('analyze.errorNoHeaders'))
      }

      if (ext === 'json') {
        try {
          const parsed = JSON.parse(text)
          if (!Array.isArray(parsed)) throw new Error(t('analyze.errorJsonArray'))
          if (parsed.length === 0) throw new Error(t('analyze.errorJsonEmpty'))
        } catch (e: any) {
          throw new Error(e.message.startsWith('JSON') ? e.message : t('analyze.errorJsonInvalid'))
        }
      }

      setProgress(t('analyze.progressLoading'))
      if (ext === 'json') await loadJSON(text, 'analyze_data')
      else await loadCSV(text, 'analyze_data')

      const rowCountResult = await runQuery('SELECT COUNT(*) as cnt FROM analyze_data')
      const rows_total = Number(rowCountResult[0]?.cnt ?? 0)

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
      const missing = await detectMissing(colNames)

      setProgress(t('analyze.progressDuplicates'))
      const duplicates = await detectDuplicates(colNames)

      setProgress(t('analyze.progressOutliers'))
      const outliers = await detectOutliers(colNames, iqrMultiplier)

      const anomalies = [...missing, ...duplicates, ...outliers]
        .sort((a, b) => a.row_index - b.row_index)

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