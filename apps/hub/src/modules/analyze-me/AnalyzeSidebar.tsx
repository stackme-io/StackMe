import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AnalyzeResult } from './types'

export type Sensitivity = 'conservative' | 'balanced' | 'aggressive'

export const SENSITIVITY_MULTIPLIER: Record<Sensitivity, number> = {
  conservative: 3.0,
  balanced:     1.5,
  aggressive:   1.0,
}

const SENSITIVITY_OPTIONS: { id: Sensitivity; labelKey: string; descKey: string; recommended?: boolean }[] = [
  { id: 'conservative', labelKey: 'sensitivityConservativeLabel', descKey: 'sensitivityConservativeDesc' },
  { id: 'balanced',     labelKey: 'sensitivityBalancedLabel',     descKey: 'sensitivityBalancedDesc',     recommended: true },
  { id: 'aggressive',   labelKey: 'sensitivityAggressiveLabel',   descKey: 'sensitivityAggressiveDesc' },
]

interface AnalyzeSidebarProps {
  result: AnalyzeResult | null
  sensitivity: Sensitivity
  onSensitivityChange: (s: Sensitivity) => void
}

export function AnalyzeSidebar({ result, sensitivity, onSensitivityChange }: AnalyzeSidebarProps) {
  const { t } = useTranslation('analyze-me')
  const [hintOpen, setHintOpen] = useState(false)

  const counts = result ? {
    missing:   result.anomalies.filter(a => a.anomaly_type === 'missing').length,
    duplicate: result.anomalies.filter(a => a.anomaly_type === 'duplicate').length,
    outlier:   result.anomalies.filter(a => a.anomaly_type === 'outlier').length,
  } : null

  return (
    <div className="w-[208px] h-full flex flex-col overflow-hidden">

      {result && counts ? (
        <div className="p-3 pb-2 border-b border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            {t('overviewLabel')}
          </p>
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-muted-foreground/95">{t('rows')}</span>
              <strong className="text-xs text-foreground">{result.rows_total}</strong>
            </div>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-muted-foreground/95">{t('anomalies')}</span>
              <strong className="text-xs text-foreground">{result.anomalies_count}</strong>
            </div>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-red-400">{t('nulls')}</span>
              <strong className="text-xs text-red-400">{counts.missing}</strong>
            </div>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-blue-400">{t('duplicates')}</span>
              <strong className="text-xs text-blue-400">{counts.duplicate}</strong>
            </div>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-amber-400">{t('outliers')}</span>
              <strong className="text-xs text-amber-400">{counts.outlier}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 pb-2 border-b border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            {t('detectsLabel')}
          </p>
          <div className="flex flex-col">
            <div className="flex items-start gap-2 px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-[5px]" />
              <div>
                <span className="block text-xs text-foreground">{t('nulls')}</span>
                <span className="block text-[11px] text-muted-foreground/95 leading-relaxed">{t('detectsNullsDesc')}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-[5px]" />
              <div>
                <span className="block text-xs text-foreground">{t('duplicates')}</span>
                <span className="block text-[11px] text-muted-foreground/95 leading-relaxed">{t('detectsDuplicatesDesc')}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-[5px]" />
              <div>
                <span className="block text-xs text-foreground">{t('outliers')}</span>
                <span className="block text-[11px] text-muted-foreground/95 leading-relaxed">{t('detectsOutliersDesc')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 pb-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          {t('sensitivityLabel')}
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
                <span className={`text-xs font-medium ${sensitivity === opt.id ? 'text-teal-300' : 'text-muted-foreground/95'}`}>
                  {t(opt.labelKey)}
                </span>
                {opt.recommended && (
                  <span className="text-[10px] text-muted-foreground">{t('sensitivityRec')}</span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground/95 leading-relaxed mt-0.5">
                {t(opt.descKey)}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setHintOpen(o => !o)}
          className="flex items-center gap-1 mt-2 px-2 text-left group"
        >
          <span className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors">
            {t('sensitivityAffects')}
          </span>
          <span
            className="text-xs text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-all duration-150"
            style={{ transform: hintOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}
          >
            ⌄
          </span>
        </button>
        <div className={`grid transition-all duration-200 ${hintOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <p className="mt-1.5 mx-2 px-2 py-2 rounded-md bg-muted/30 border border-border/40 text-xs text-muted-foreground leading-relaxed">
              {t('sensitivityHint')}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}