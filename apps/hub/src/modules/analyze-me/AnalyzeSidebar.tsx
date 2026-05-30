import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { AnalyzeResult } from './types'

type FilterType = 'all' | 'anomalies' | 'missing' | 'duplicate' | 'outlier' | 'missed'
export type Sensitivity = 'conservative' | 'balanced' | 'aggressive'

export const SENSITIVITY_MULTIPLIER: Record<Sensitivity, number> = {
  conservative: 3.0,
  balanced:     1.5,
  aggressive:   1.0,
}

const SENSITIVITY_OPTIONS: { id: Sensitivity; label: string; desc: string; recommended?: boolean }[] = [
  { id: 'conservative', label: 'Conservative', desc: 'Only obvious outliers. Fewer false positives.' },
  { id: 'balanced',     label: 'Balanced',     desc: 'Standard detection. Works for most datasets.', recommended: true },
  { id: 'aggressive',   label: 'Aggressive',   desc: 'Catches subtle patterns. Expect more noise.' },
]

interface FilterDef {
  key:         FilterType
  label:       string
  dot?:        string
  pillClass?:  string
  activeText?: string
}

interface AnalyzeSidebarProps {
  result: AnalyzeResult | null
  filter: FilterType
  onFilter: (f: FilterType) => void
  missedCount?: number
  sensitivity: Sensitivity
  onSensitivityChange: (s: Sensitivity) => void
}

export function AnalyzeSidebar({
  result, filter, onFilter, missedCount,
  sensitivity, onSensitivityChange,
}: AnalyzeSidebarProps) {
  const { t } = useTranslation('analyze-me')

  const counts = result ? {
    missing:   result.anomalies.filter(a => a.anomaly_type === 'missing').length,
    duplicate: result.anomalies.filter(a => a.anomaly_type === 'duplicate').length,
    outlier:   result.anomalies.filter(a => a.anomaly_type === 'outlier').length,
  } : null

  const FILTERS: FilterDef[] = counts ? [
    { key: 'all',       label: t('filterAll') },
    { key: 'anomalies', label: t('filterAnomalies') },
    { key: 'missing',   label: `${t('filterNulls')} (${counts.missing})`,        dot: 'bg-red-400' },
    { key: 'duplicate', label: `${t('filterDuplicates')} (${counts.duplicate})`, dot: 'bg-blue-400' },
    { key: 'outlier',   label: `${t('filterOutliers')} (${counts.outlier})`,     dot: 'bg-amber-400' },
    ...(missedCount
      ? [{ key: 'missed' as FilterType, label: `✗ Missed (${missedCount})`, pillClass: 'bg-amber-950/30', activeText: 'text-amber-300' }]
      : []),
  ] : []

  return (
    <div className="w-[208px] h-full flex flex-col overflow-hidden">

      {result && counts && (
        <>
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

          <div className="p-3 pb-2 border-b border-border">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-2">
              Filter
            </p>
            <div className="flex flex-col gap-0.5">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => onFilter(f.key)}
                  className={`relative px-2 py-1.5 rounded-md text-xs text-left transition-colors ${
                    filter === f.key
                      ? (f.activeText ?? 'text-foreground')
                      : 'text-muted-foreground/70 hover:text-foreground'
                  }`}
                >
                  {filter === f.key && (
                    <motion.div
                      layoutId="filter-pill"
                      className={`absolute inset-0 rounded-md ${f.pillClass ?? 'bg-primary/10'}`}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {f.dot && (
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.dot}`} />
                    )}
                    {f.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="p-3 pb-2">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-2">
          Sensitivity
        </p>
        <div className="flex flex-col gap-0.5">
          {SENSITIVITY_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => onSensitivityChange(opt.id)}
              className={`flex flex-col px-2 py-2 rounded-md text-left transition-colors ${
                sensitivity === opt.id
                  ? 'bg-teal-950/40 border border-teal-800/50'
                  : 'hover:bg-muted/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-medium ${sensitivity === opt.id ? 'text-teal-300' : 'text-muted-foreground/70'}`}>
                  {opt.label}
                </span>
                {opt.recommended && (
                  <span className="text-[9px] text-muted-foreground/40">rec.</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground/50 leading-relaxed mt-0.5">
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground/40 mt-2 px-2">
          Affects outlier detection only
        </p>
      </div>

    </div>
  )
}