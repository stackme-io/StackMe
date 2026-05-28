import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAnalyze } from './useAnalyze'
import { UploadZone } from './UploadZone'
import { AnalysisSummary } from './AnalysisSummary'
import { AnomalyTable } from './AnomalyTable'
import { AnomalyCards } from './AnomalyCards'
import { popHandoff, type ForgeHandoff } from '../../shared/forgeHandoff'

type FilterType = 'all' | 'anomalies' | 'missing' | 'duplicate' | 'outlier'

export function AnalyzeSection() {
  const { result, tableData, loading, progress, sizeWarn, error, fileName, analyze } = useAnalyze()
  const { t } = useTranslation('analyze-me')
  const [filter, setFilter] = useState<FilterType>('all')
  const [forgeData, setForgeData] = useState<ForgeHandoff | null>(null)

  useEffect(() => {
    const handoff = popHandoff()
    if (!handoff) return
    setForgeData(handoff)
    const json = JSON.stringify(handoff.rows)
    const file = new File([json], `forgeme-${handoff.seed}.json`, { type: 'application/json' })
    analyze(file)
  }, [])

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

  return (
    <div>

      <UploadZone loading={loading} progress={progress} fileName={fileName} onFile={analyze} />

      {forgeData && (
        <div className="mt-3 mb-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-muted/20">
          <i className="ti ti-arrows-transfer-up text-sm text-muted-foreground/70" />
          <span className="text-xs text-muted-foreground/70">
            Imported from <span className="text-violet-300">ForgeMe</span>
          </span>
          <span className="text-muted-foreground/30 text-sm">·</span>
          <span className="text-xs text-amber-500">
            {forgeData.anomalies.length} injected anomalies
          </span>
          <span className="text-muted-foreground/30 text-sm">·</span>
          <span className="text-xs text-muted-foreground/50 font-mono">
            seed {forgeData.seed}
          </span>
          {loading && (
            <>
              <span className="text-muted-foreground/30 text-sm">·</span>
              <span className="text-xs text-muted-foreground/50">{progress ?? 'Analyzing imported dataset...'}</span>
            </>
          )}
        </div>
      )}

      {sizeWarn && !loading && result && (
        <div className="mt-2 px-4 py-2 rounded-lg bg-amber-950/20 text-amber-400 text-xs border border-amber-900/40">
          {t('sizeWarning')}
        </div>
      )}

      {error && (
        <div className="mt-3 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 flex flex-col gap-3">
          <AnalysisSummary result={result} filter={filter} onFilter={setFilter} />
          <AnomalyTable
            tableData={filteredTableData}
            anomalies={filteredAnomalies}
            injectedAnomalies={forgeData?.anomalies ?? []}
          />
          <AnomalyCards anomalies={filteredAnomalies} />
        </div>
      )}
    </div>
  )
}