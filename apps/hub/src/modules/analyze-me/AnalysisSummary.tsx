import { useTranslation } from 'react-i18next'
import type { AnalyzeResult } from './types'

type FilterType = 'all' | 'anomalies' | 'missing' | 'duplicate' | 'outlier' | 'missed'

interface AnalysisSummaryProps {
  result: AnalyzeResult
  filter: FilterType
  onFilter: (f: FilterType) => void
  missedCount?: number
}

export function AnalysisSummary({ result, filter, onFilter, missedCount }: AnalysisSummaryProps) {
  const { t } = useTranslation('analyze-me')

  const counts = {
    missing:   result.anomalies.filter(a => a.anomaly_type === 'missing').length,
    duplicate: result.anomalies.filter(a => a.anomaly_type === 'duplicate').length,
    outlier:   result.anomalies.filter(a => a.anomaly_type === 'outlier').length,
  }

  const FILTERS: { key: FilterType; label: string; activeClass?: string }[] = [
    { key: 'all',       label: t('filterAll') },
    { key: 'anomalies', label: t('filterAnomalies') },
    { key: 'missing',   label: `${t('filterNulls')} (${counts.missing})` },
    { key: 'duplicate', label: `${t('filterDuplicates')} (${counts.duplicate})` },
    { key: 'outlier',   label: `${t('filterOutliers')} (${counts.outlier})` },
    ...(missedCount
      ? [{ key: 'missed' as FilterType, label: `✗ Missed (${missedCount})`, activeClass: 'bg-amber-950/30 text-amber-300' }]
      : []),
  ]

  return (
    <div className="flex flex-col">
      <div className="p-3 pb-2 border-b border-border">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-2">
          Overview
        </p>
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs text-muted-foreground/70">{t('rows')}</span>
            <strong className="text-xs text-foreground">{result.rows_total}</strong>
          </div>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs text-muted-foreground/70">{t('anomalies')}</span>
            <strong className="text-xs text-foreground">{result.anomalies_count}</strong>
          </div>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs text-red-400/70">{t('nulls')}</span>
            <strong className="text-xs text-red-400">{counts.missing}</strong>
          </div>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs text-blue-400/70">{t('duplicates')}</span>
            <strong className="text-xs text-blue-400">{counts.duplicate}</strong>
          </div>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs text-amber-400/70">{t('outliers')}</span>
            <strong className="text-xs text-amber-400">{counts.outlier}</strong>
          </div>
        </div>
      </div>

      <div className="p-3 pb-2">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-2">
          Filter
        </p>
        <div className="flex flex-col gap-0.5">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => onFilter(f.key)}
              className={`px-2 py-1.5 rounded-md text-xs text-left transition-colors ${
                filter === f.key
                  ? (f.activeClass ?? 'bg-primary/10 text-foreground')
                  : 'text-muted-foreground/70 hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}