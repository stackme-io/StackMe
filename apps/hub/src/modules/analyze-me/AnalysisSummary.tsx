import { useTranslation } from 'react-i18next'
import type { AnalyzeResult } from './types'

type FilterType = 'all' | 'anomalies' | 'missing' | 'duplicate' | 'outlier'

interface AnalysisSummaryProps {
  result: AnalyzeResult
  filter: FilterType
  onFilter: (f: FilterType) => void
}

export function AnalysisSummary({ result, filter, onFilter }: AnalysisSummaryProps) {
  const { t } = useTranslation()

  const counts = {
    missing:   result.anomalies.filter(a => a.anomaly_type === 'missing').length,
    duplicate: result.anomalies.filter(a => a.anomaly_type === 'duplicate').length,
    outlier:   result.anomalies.filter(a => a.anomaly_type === 'outlier').length,
  }

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',       label: t('analyze.filterAll') },
    { key: 'anomalies', label: t('analyze.filterAnomalies') },
    { key: 'missing',   label: `${t('analyze.filterNulls')} (${counts.missing})` },
    { key: 'duplicate', label: `${t('analyze.filterDuplicates')} (${counts.duplicate})` },
    { key: 'outlier',   label: `${t('analyze.filterOutliers')} (${counts.outlier})` },
  ]

  return (
    <>
      <div className="flex gap-4 px-4 py-3 rounded-lg bg-muted/50 border border-border text-sm">
        <span className="text-muted-foreground">
          {t('analyze.rows')}: <strong className="text-foreground">{result.rows_total}</strong>
        </span>
        <span className="text-muted-foreground">
          {t('analyze.anomalies')}: <strong className="text-foreground">{result.anomalies_count}</strong>
        </span>
        <span className="text-red-400/70 text-xs self-center">{t('analyze.nulls')}: <strong>{counts.missing}</strong></span>
        <span className="text-blue-400/70 text-xs self-center">{t('analyze.duplicates')}: <strong>{counts.duplicate}</strong></span>
        <span className="text-amber-400/70 text-xs self-center">{t('analyze.outliers')}: <strong>{counts.outlier}</strong></span>
      </div>

      <div className="flex mb-1">
        <div className="flex border border-border rounded-lg overflow-hidden">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => onFilter(f.key)}
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
    </>
  )
}