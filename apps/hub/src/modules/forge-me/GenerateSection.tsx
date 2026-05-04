import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../../api/client'
import { loadJSON, runQuery, loadAnomalyIndex } from '../../shared/analytics'
import { AnomalyTable } from './AnomalyTable'
import type { AnomalyType, HistoryEntry, DataFormat, FilterMode, GenerateResponse } from './types'
import type { ParsedField } from './SchemaSection'

interface GenerateSectionProps {
  selectedAnomalies: Set<AnomalyType>
  seed: number
  rows: number
  anomalyRate: number
  onSeedChange: (seed: number) => void
  onRowsChange: (rows: number) => void
  onAnomalyRateChange: (rate: number) => void
  onGenerated: (entry: HistoryEntry) => void
  schemaFields?: ParsedField[]
}

export function GenerateSection({
  selectedAnomalies,
  seed,
  rows,
  anomalyRate,
  onSeedChange,
  onRowsChange,
  onAnomalyRateChange,
  onGenerated,
  schemaFields,
}: GenerateSectionProps) {
  const { t } = useTranslation()
  const [format, setFormat]             = useState<DataFormat>('json')
  const [result, setResult]             = useState<GenerateResponse | null>(null)
  const [tableData, setTableData]       = useState<any[]>([])
  const [filterMode, setFilterMode]     = useState<FilterMode>('all')
  const [loading, setLoading]           = useState(false)
  const [filterLoading, setFilterLoading] = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setTableData([])
    setFilterMode('all')

    try {
      const response = await apiClient.post<GenerateResponse>('/forge-me/generate', {
        format,
        rows,
        anomaly_rate: anomalyRate,
        seed,
        anomaly_types: [...selectedAnomalies],
        schema: schemaFields && schemaFields.length > 0
          ? schemaFields.map(f => ({ name: f.name, type: f.type }))
          : undefined,
      })
      setResult(response.data)

      if (format === 'json') {
        await loadJSON(response.data.data, 'sensor_data')
        await loadAnomalyIndex(response.data.anomalies.map(a => a.row_index))
        const data = await runQuery('SELECT * FROM sensor_data')
        setTableData(data)
      }

      onGenerated({
        rows,
        rate: anomalyRate,
        format,
        anomalies: [...selectedAnomalies],
      })
    } catch (err) {
      setError(t('forge.apiError'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = async (mode: FilterMode) => {
    if (!result) return
    setFilterLoading(true)
    setFilterMode(mode)
    try {
      if (mode === 'all') {
        const data = await runQuery('SELECT * FROM sensor_data')
        setTableData(data)
      } else {
        const data = await runQuery(`
          SELECT s.* FROM sensor_data s
          INNER JOIN anomaly_index a ON s.id - 1 = a.row_index
        `)
        setTableData(data)
      }
    } finally {
      setFilterLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">

      {/* Настройки */}
      <div className="flex gap-4">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('forge.format')}
          </label>
          <select
            value={format}
            onChange={e => setFormat(e.target.value as DataFormat)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="sql">SQL</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('forge.rowCount')}
          </label>
          <input
            type="number"
            value={rows}
            onChange={e => onRowsChange(Number(e.target.value))}
            min={10} max={10000}
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('forge.anomalyRate')}
          </label>
          <input
            type="number"
            value={anomalyRate}
            onChange={e => onAnomalyRateChange(Number(e.target.value))}
            min={0} max={0.5} step={0.01}
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Seed row */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">seed=</span>
        <span className="text-xs text-foreground font-mono">{seed}</span>
        <button
          onClick={() => onSeedChange(Math.floor(Math.random() * 99999) + 1)}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm leading-none"
          title="Randomize seed"
        >
          ↺
        </button>
      </div>

      {/* Generate button */}
      <button
        onClick={handleSubmit}
        disabled={loading || selectedAnomalies.size === 0}
        className="self-start px-5 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? t('forge.generating') : t('forge.generate')}
      </button>

      {/* Ошибка */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}

      {/* Stat bar */}
      {result && (
        <div className="flex gap-4 px-4 py-3 rounded-lg bg-muted/50 border border-border text-sm">
          <span className="text-muted-foreground">
            {t('forge.rows')}: <strong className="text-foreground">{result.rows_total}</strong>
          </span>
          <span className="text-muted-foreground">
            {t('forge.anomalies')}: <strong className="text-amber-500">{result.anomalies_count}</strong>
          </span>
          <span className="text-muted-foreground">
            Format: <strong className="text-foreground">{result.format.toUpperCase()}</strong>
          </span>
          <span className="text-muted-foreground">
            seed: <strong className="text-foreground font-mono">{seed}</strong>
          </span>
        </div>
      )}

      {/* Таблица */}
      {tableData.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {t('forge.dataFromDuckDB')} ({tableData.length})
            </span>
            <div className="flex gap-2">
              {(['all', 'anomalies'] as FilterMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => handleFilter(mode)}
                  disabled={filterLoading}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    filterMode === mode
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {mode === 'all' ? t('forge.allRows') : `⚠ ${t('forge.anomaliesOnly')}`}
                </button>
              ))}
            </div>
          </div>
          <AnomalyTable
            tableData={tableData}
            anomalies={result?.anomalies ?? []}
            isTimestamp={col => col === 'timestamp' || col.toLowerCase().includes('date') || col.toLowerCase().includes('time')}
          />
        </div>
      )}

    </div>
  )
}