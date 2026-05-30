import { useState, useEffect, useRef } from 'react'
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
  onFilter: (f: FilterType) => void
}

export function AnalyzeSection({
  result, tableData, loading, progress, sizeWarn, error, fileName,
  filter, forgeData, verdictCounts, onFile, onFilter,
}: AnalyzeSectionProps) {
  const { t } = useTranslation('analyze-me')
  const [copied, setCopied]       = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const fileInputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (result && !loading) setCollapsed(true)
  }, [result, loading])

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

    const rawKeys = Object.keys(filteredTableData[0]).filter(k => k !== '_row_index')

    const typeMap = new Map<number, string[]>()
    for (const a of filteredAnomalies) {
      const existing = typeMap.get(a.row_index) ?? []
      existing.push(a.anomaly_type)
      typeMap.set(a.row_index, existing)
    }

    const getVerdict = (idx: number): string => {
      if (!forgeData) return ''
      if (injectedSet.has(idx) && detectedSet.has(idx))  return 'detected'
      if (injectedSet.has(idx) && !detectedSet.has(idx)) return 'missed'
      if (!injectedSet.has(idx) && detectedSet.has(idx)) return 'false_positive'
      return ''
    }

    const hasType    = filteredAnomalies.length > 0
    const hasVerdict = !!forgeData

    const headers = [
      ...rawKeys,
      ...(hasType    ? ['type']    : []),
      ...(hasVerdict ? ['verdict'] : []),
    ]

    const tsv = [
      headers.join('\t'),
      ...filteredTableData.map(row => {
        const idx     = Number(row._row_index)
        const types   = typeMap.get(idx)?.join(', ') ?? ''
        const verdict = getVerdict(idx)
        return [
          ...rawKeys.map(k => String(row[k] ?? '')),
          ...(hasType    ? [types]   : []),
          ...(hasVerdict ? [verdict] : []),
        ].join('\t')
      }),
    ].join('\n')

    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleReplaceClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFile(file)
      e.target.value = ''
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        className="hidden"
        onChange={handleInputChange}
      />

      <div className={`grid transition-all duration-200 ${collapsed ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div
            className="flex items-center gap-2 bg-muted/20 rounded-xl px-4 py-1.5 mb-3 cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => setCollapsed(false)}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted-foreground/70 flex-shrink-0">
              <path d="M2 1.5h5.5L10 4v6.5H2V1.5z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
              <path d="M7 1.5V4.5h3" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
            </svg>
            <span className="text-xs text-muted-foreground/70 font-mono">{fileName}</span>
            {result && (
              <>
                <span className="text-muted-foreground/30 text-sm">·</span>
                <span className="text-xs text-muted-foreground/70">{result.rows_total} rows</span>
                <span className="text-muted-foreground/30 text-sm">·</span>
                <span className="text-xs text-amber-500">{result.anomalies_count} anomalies</span>
              </>
            )}
            <button
              onClick={handleReplaceClick}
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
            >
              <i className="ti ti-pencil text-[11px]" />
              Replace
            </button>
          </div>
        </div>
      </div>

      <div className={`grid transition-all duration-200 ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
        <div className="overflow-hidden">
          <UploadZone loading={loading} progress={progress} fileName={fileName} onFile={onFile} />
        </div>
      </div>

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
          <div className="flex items-center gap-1 flex-wrap">
            {([
              { key: 'all'       as FilterType, label: 'All rows' },
              { key: 'anomalies' as FilterType, label: 'Anomalies only' },
              { key: 'missing'   as FilterType, label: `Nulls (${result.anomalies.filter(a => a.anomaly_type === 'missing').length})`,   dot: 'bg-red-400' },
              { key: 'duplicate' as FilterType, label: `Duplicates (${result.anomalies.filter(a => a.anomaly_type === 'duplicate').length})`, dot: 'bg-blue-400' },
              { key: 'outlier'   as FilterType, label: `Outliers (${result.anomalies.filter(a => a.anomaly_type === 'outlier').length})`,  dot: 'bg-amber-400' },
              ...(verdictCounts && verdictCounts.missed > 0
                ? [{ key: 'missed' as FilterType, label: `✗ Missed (${verdictCounts.missed})`, dot: undefined }]
                : []),
            ] as { key: FilterType; label: string; dot?: string }[]).map(chip => (
              <button
                key={chip.key}
                onClick={() => onFilter(chip.key)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
                  filter === chip.key
                    ? chip.key === 'missed'
                      ? 'bg-amber-950/30 text-amber-300'
                      : 'bg-muted/60 text-foreground'
                    : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/30'
                }`}
              >
                {chip.dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${chip.dot}`} />}
                {chip.label}
              </button>
            ))}
            <button
              onClick={handleCopy}
              className="ml-auto flex items-center justify-center gap-1.5 w-[76px] py-1 text-xs border border-border rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 transition-colors"
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