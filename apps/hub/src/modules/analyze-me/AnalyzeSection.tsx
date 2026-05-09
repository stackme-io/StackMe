import { useState } from 'react'
import { useAnalyze } from './useAnalyze'
import { UploadZone } from './UploadZone'
import { AnalysisSummary } from './AnalysisSummary'
import { AnomalyTable } from './AnomalyTable'
import { AnomalyCards } from './AnomalyCards'

type FilterType = 'all' | 'anomalies' | 'missing' | 'duplicate' | 'outlier'

export function AnalyzeSection() {
  const { result, tableData, loading, progress, sizeWarn, error, fileName, analyze } = useAnalyze()
  const [filter, setFilter] = useState<FilterType>('all')

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

      {sizeWarn && !loading && result && (
        <div className="mt-2 px-4 py-2 rounded-lg bg-amber-950/20 text-amber-400 text-xs border border-amber-900/40">
          Large file detected — analysis may take longer than usual.
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
          <AnomalyTable tableData={filteredTableData} anomalies={filteredAnomalies} />
          <AnomalyCards anomalies={filteredAnomalies} />
        </div>
      )}
    </div>
  )
}