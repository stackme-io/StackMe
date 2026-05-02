import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../../api/client'
import { loadJSON, runQuery, loadAnomalyIndex } from '../../shared/analytics'
import { AnomalyTable } from './AnomalyTable'
import type { AnalyzeResponse } from './types'
import { csvToJson } from './types'

export function AnalyzeSection() {
  const { t } = useTranslation()
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [analyzeTableData, setAnalyzeTableData] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAnalyze = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setAnalyzeError(t('forge.analyzeError'))
      return
    }

    setAnalyzeLoading(true)
    setAnalyzeError(null)
    setAnalyzeResult(null)
    setAnalyzeTableData([])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiClient.post<AnalyzeResponse>(
        '/forge-me/analyze',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setAnalyzeResult(response.data)

      const text = await file.text()
      await loadJSON(JSON.stringify(csvToJson(text)), 'analyze_data')
      await loadAnomalyIndex(response.data.anomalies.map(a => a.row_index))
      const data = await runQuery('SELECT * FROM analyze_data')
      setAnalyzeTableData(data)

    } catch (err) {
      setAnalyzeError(t('forge.analyzeError'))
      console.error(err)
    } finally {
      setAnalyzeLoading(false)
    }
  }, [t])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleAnalyze(file)
  }, [handleAnalyze])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  return (
    <div className="border-t border-border pt-8 mt-6">
      <h2 className="text-base font-semibold text-foreground mb-1">{t('forge.analyzeTitle')}</h2>
      <p className="text-sm text-muted-foreground mb-4">{t('forge.analyzeSubtitle')}</p>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
        }`}
      >
        <div className="text-3xl mb-2">📂</div>
        <p className="text-sm font-medium text-foreground mb-1">
          {analyzeLoading ? t('forge.analyzing') : t('forge.dropzone')}
        </p>
        <p className="text-xs text-muted-foreground">{t('forge.csvOnly')}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleAnalyze(file)
          }}
        />
      </div>

      {analyzeError && (
        <div className="mt-3 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {analyzeError}
        </div>
      )}

      {analyzeResult && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex gap-4 px-4 py-3 rounded-lg bg-muted/50 border border-border text-sm">
            <span className="text-muted-foreground">{t('forge.rows')}: <strong className="text-foreground">{analyzeResult.rows_total}</strong></span>
            <span className="text-muted-foreground">{t('forge.anomaliesFound')}: <strong className="text-foreground">{analyzeResult.anomalies_count}</strong></span>
          </div>

          <AnomalyTable
            tableData={analyzeTableData}
            anomalies={analyzeResult.anomalies}
          />

          {analyzeResult.anomalies.map((a, i) => (
            <div key={i} className="px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border-l-2 border-amber-400 text-sm">
              <span className="font-medium text-foreground">Row {a.row_index}</span>
              <span className="text-muted-foreground"> · {a.column} · {a.anomaly_type}</span>
              <br />
              <span className="text-foreground">{a.description}</span>
              {a.original_value && (
                <span className="text-muted-foreground"> (value: {a.original_value})</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
