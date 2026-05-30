import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UploadZone } from './UploadZone'
import { AnomalyTable } from './AnomalyTable'
import { AnomalyCards } from './AnomalyCards'
import type { ForgeHandoff } from '../../shared/forgeHandoff'
import type { AnalyzeResult } from './types'

type FilterType = 'all' | 'anomalies' | 'missing' | 'duplicate' | 'outlier' | 'missed'

interface VerdictCounts {
  detected: number
  missed: number
  false_positive: number
}

interface AnalyzeSectionProps {
  result: AnalyzeResult | null
  tableData: any[]
  loading: boolean
  progress: string | null
  sizeWarn: boolean
  error: string | null
  fileName: string | null
  filter: FilterType
  forgeData: ForgeHandoff | null
  verdictCounts: VerdictCounts | null
  onFile: (file: File) => void
}

export function AnalyzeSection({
  result, tableData, loading, progress, sizeWarn, error, fileName,
  filter, forgeData, verdictCounts, onFile,
}: AnalyzeSectionProps) {
  const { t } = useTranslation('analyze-me')
  const [copied, setCopied] = useState(false)

  const detectedSet = new Set(result?.anomalies.map(a => a.row_index) ?? [])
  const injectedSet = new Set(forgeData?.anomalies.map(a => a.row_index) ?? [])

  const filteredTableData = filter === 'all'
    ? tableData
    : filter === 'anomalies'
    ? tableData.filter(row => detectedSet.has(Number(row._row_index)))
    : filter === 'missed'
    ? tableData.filter(row => {
        const idx = Number(row._row_index)
        return injectedSet.has(idx) && !detectedSet.has(idx)
      })
    : tableData.filter(row => {
        const idx = Number(row._row_index)
        return result?.anomalies.some(a => a.row_index === idx && a.anomaly_type === filter)
      })

  const filteredAnomalies = filter === 'missed'
    ? []
    : filter === 'all' || filter === 'anomalies'
    ? result?.anomalies ?? []
    : result?.anomalies.filter(a => a.anomaly_type === filter) ?? []

  const handleCopy = () => {
    if (filteredTableData.length === 0) return
    const keys = Object.keys(filteredTableData[0]).filter(k => k !== '_row_index')
    const tsv = [
      keys.join('\t'),
      ...filteredTableData.map(row => keys.map(k => String(row[k] ?? '')).join('\t')),
    ].join('\n')
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div>
      <UploadZone loading={loading} progress={progress} fileName={fileName} onFile={onFile} />

      {forgeData && (
        <div className="mt-3 mb-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-muted/20">
          <i className="ti ti-arrows-transfer-up text-sm text-muted-foreground/70" />
          <span className="text-xs text-muted-foreground/70">
            Imported from <span className="text-violet-300">ForgeMe</span>
          </span>
          <span className="text-muted-foreground/30 text-sm">·</span>
          <span className="text-xs text-amber-500">{forgeData.anomalies.length} injected</span>
          <span className="text-muted-foreground/30 text-sm">·</span>
          <span className="text-xs text-muted-foreground/70 font-mono">seed {forgeData.seed}</span>
          {loading ? (
            <>
              <span className="text-muted-foreground/30 text-sm">·</span>
              <span className="text-xs text-muted-foreground/70">{progress ?? 'Analyzing...'}</span>
            </>
          ) : verdictCounts && (
            <>
              <span className="text-muted-foreground/30 text-sm">·</span>
              <span className="text-xs text-green-400">✓ {verdictCounts.detected} detected</span>
              {verdictCounts.missed > 0 && (
                <>
                  <span className="text-muted-foreground/30 text-sm">·</span>
                  <span className="text-xs text-amber-400">✗ {verdictCounts.missed} missed</span>
                </>
              )}
              {verdictCounts.false_positive > 0 && (
                <>
                  <span className="text-muted-foreground/30 text-sm">·</span>
                  <span className="text-xs text-red-400">⚠ {verdictCounts.false_positive} false positive</span>
                </>
              )}
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
          <div className="flex justify-end">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 w-[76px] py-1 text-xs border border-border rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <i className={`ti ${copied ? 'ti-check' : 'ti-clipboard'} text-sm`} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
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