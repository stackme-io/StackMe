import { useTranslation } from 'react-i18next'
import type { AnomalyInfo } from './types'

interface AnomalyCardsProps {
  anomalies: AnomalyInfo[]
}

export function AnomalyCards({ anomalies }: AnomalyCardsProps) {
  const { t } = useTranslation()

  if (anomalies.length === 0) return null

  return (
    <div className="flex flex-col gap-2 mt-1">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground px-1">
        {t('analyze.anomalyDetails')}
      </p>
      {anomalies.map((a, i) => (
        <div
          key={i}
          className={`px-4 py-3 rounded-lg text-sm border-l-2 ${
            a.anomaly_type === 'missing'
              ? 'border-red-500 bg-red-950/10'
              : a.anomaly_type === 'duplicate'
              ? 'border-blue-500 bg-blue-950/10'
              : 'border-amber-500 bg-amber-950/10'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-foreground">{t('analyze.row')} {a.row_index}</span>
            {a.column !== '*' && (
              <span className="text-muted-foreground">· {a.column}</span>
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
              a.anomaly_type === 'missing'
                ? 'bg-red-950/40 text-red-400 border-red-900'
                : a.anomaly_type === 'duplicate'
                ? 'bg-blue-950/40 text-blue-400 border-blue-900'
                : 'bg-amber-950/40 text-amber-400 border-amber-900'
            }`}>
              {a.anomaly_type}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">{a.description}</p>
        </div>
      ))}
    </div>
  )
}