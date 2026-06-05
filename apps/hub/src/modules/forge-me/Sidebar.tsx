import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ANOMALY_REGISTRY } from './anomalies'
import type { AnomalyType, ViewMode } from './types'

const ANOMALIES_ACTIVE   = ANOMALY_REGISTRY.filter(a => a.status === 'active')
const ANOMALIES_UPCOMING = ANOMALY_REGISTRY.filter(a => a.status === 'coming_soon')

interface SidebarProps {
  selected: Set<AnomalyType>
  onToggle: (id: AnomalyType) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function Sidebar({ selected, onToggle, viewMode, onViewModeChange }: SidebarProps) {
  const [upcomingOpen, setUpcomingOpen] = useState(false)
  const { t } = useTranslation('forge-me')

  return (
    <div className="w-[208px] h-full flex flex-col overflow-hidden">

      <div className="p-3 pb-2 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          {t('sidebarAnomalyMix')}
        </p>
        <div className="flex flex-col gap-0.5">
          {ANOMALIES_ACTIVE.map(a => (
            <button
              key={a.id}
              onClick={() => onToggle(a.id as AnomalyType)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                selected.has(a.id as AnomalyType)
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center ${
                selected.has(a.id as AnomalyType) ? 'bg-primary border-primary' : 'border-border'
              }`}>
                {selected.has(a.id as AnomalyType) && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                )}
              </span>
              <span className="flex flex-col flex-1 min-w-0">
                <span className="text-xs">{a.label}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">{a.description}</span>
              </span>
            </button>
          ))}

          <button
            onClick={() => setUpcomingOpen(o => !o)}
            className="flex items-center gap-1.5 px-2 py-1.5 mt-1 text-left text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          >
            <span
              className="text-xs inline-block transition-transform duration-150"
              style={{ transform: upcomingOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              ⌄
            </span>
            <span className="text-xs">
              {upcomingOpen
                ? t('sidebarUpcomingHide')
                : t('sidebarUpcomingShow', { count: ANOMALIES_UPCOMING.length })}
            </span>
          </button>

          {upcomingOpen && (
            <div className="flex flex-col gap-0.5 mt-0.5">
              {ANOMALIES_UPCOMING.map(a => (
                <div key={a.id} className="flex flex-col px-2 py-1.5 rounded-md">
                  <span className="text-xs text-muted-foreground/95">{a.label}</span>
                  <span className="text-xs text-muted-foreground">{a.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 pb-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          {t('sidebarMode')}
        </p>
        <div className="flex flex-col gap-1.5">
          {(['raw', 'schema'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-2 py-1.5 rounded-md text-xs text-left border transition-colors ${
                viewMode === mode
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/30'
              }`}
            >
              {mode === 'raw' ? t('viewRaw') : t('viewSchema')}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}