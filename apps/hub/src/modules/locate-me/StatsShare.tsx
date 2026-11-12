import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3 } from 'lucide-react'
import type { ReportData } from '@locateme/core/types'
import type { Detection } from '@locateme/core/detect'
import { buildStats, statsBlockedReason, SUITE_AGES, type SuiteAge } from '@locateme/core/stats'
import apiClient from '../../api/client'

// "Share anonymously" - opt-in, one click, and the dialog shows byte-for-byte what is sent.
// `report` must already be scoped to the files the user kept.
export function StatsShareButton({ report, detection, fromFolder, onOpenStats }: {
  report: ReportData
  detection: Detection | null
  fromFolder: boolean
  onOpenStats: () => void
}) {
  const { t } = useTranslation('locate-me')
  const [open, setOpen] = useState(false)
  const blocked = statsBlockedReason(report, detection, fromFolder)
  return (
    <>
      <button onClick={() => setOpen(true)} disabled={!!blocked}
        title={blocked ? t(`stats.blocked.${blocked}`) : t('stats.shareTip')}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sub text-muted-foreground border border-border hover:text-foreground hover:bg-muted/40 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-colors">
        <BarChart3 className="w-3.5 h-3.5" />
        {t('stats.share')}
      </button>
      {open && detection && (
        <StatsShareModal report={report} detection={detection} onClose={() => setOpen(false)}
          onOpenStats={() => { setOpen(false); onOpenStats() }} />
      )}
    </>
  )
}

function StatsShareModal({ report, detection, onClose, onOpenStats }: {
  report: ReportData
  detection: Detection
  onClose: () => void
  onOpenStats: () => void
}) {
  const { t } = useTranslation('locate-me')
  const [age, setAge] = useState<SuiteAge | undefined>(undefined)
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const row = useMemo(() => buildStats(report, detection, age), [report, detection, age])
  const payload = useMemo(() => JSON.stringify(row, null, 2), [row])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const send = async () => {
    if (!row) return
    setState('sending')
    try {
      // No Authorization header on purpose: the row is never linked to an account.
      await apiClient.post('/api/locate/stats', row, { headers: { Authorization: undefined } })
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    <div onClick={onClose}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 sm:px-4 animate-in fade-in-0 duration-200">
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="stats-share-title"
        className="w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden rounded-t-2xl sm:rounded-xl border-t sm:border border-border bg-card shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-bottom-2 sm:zoom-in-95 duration-200">
        <div className="flex-shrink-0 border-b border-border px-5 sm:px-6 pt-3 sm:pt-5 pb-3">
          <div className="sm:hidden flex justify-center pb-2"><span className="w-9 h-1 rounded-full bg-border" /></div>
          <div className="flex items-start justify-between gap-3">
            <h2 id="stats-share-title" className="text-title text-foreground">{t('stats.shareTitle')}</h2>
            <button onClick={onClose} title={t('close')} aria-label={t('close')}
              className="flex items-center justify-center w-8 h-8 -mr-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex-shrink-0">✕</button>
          </div>
        </div>

        {state === 'done' ? (
          <div className="px-5 sm:px-6 py-6 flex flex-col gap-4">
            <p className="text-body text-foreground">{t('stats.thanks')}</p>
            <div className="flex gap-2">
              <button onClick={onOpenStats}
                className="px-3 py-1.5 rounded-md text-sub font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                {t('stats.seeStats')}
              </button>
              <button onClick={onClose} className="px-3 py-1.5 rounded-md text-sub text-muted-foreground hover:text-foreground transition-colors">
                {t('close')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 flex flex-col gap-4 text-sub text-content leading-relaxed">
              <p>{t('stats.shareLead')}</p>

              <div className="flex flex-col gap-2">
                <p className="text-foreground">{t('stats.ageQuestion')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUITE_AGES.map(a => (
                    <button key={a} onClick={() => setAge(age === a ? undefined : a)} aria-pressed={age === a}
                      className={`px-2.5 py-1 rounded-md border text-meta transition-colors ${age === a
                        ? 'border-[var(--tool-accent,#22d3ee)] text-foreground bg-muted/50'
                        : 'border-border text-muted-foreground hover:text-foreground'}`}>
                      {t(`stats.age.${a}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-foreground">{t('stats.exactlySent')}</p>
                <pre className="text-code bg-muted/40 border border-border rounded-md px-3 py-2.5 overflow-x-auto max-h-56">{payload}</pre>
              </div>

              <ul className="flex flex-col gap-1.5 list-disc pl-5">
                <li>{t('stats.notSent')}</li>
                <li>{t('stats.colleagues')}</li>
                <li>{t('stats.noDelete')}</li>
                <li>{t('stats.publicOnly')}</li>
              </ul>
            </div>

            <div className="flex-shrink-0 border-t border-border px-5 sm:px-6 py-3 flex items-center gap-3">
              <button onClick={send} disabled={state === 'sending' || !row}
                className="px-3 py-1.5 rounded-md text-sub font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {state === 'sending' ? '...' : t('stats.send')}
              </button>
              <button onClick={onClose} className="px-3 py-1.5 rounded-md text-sub text-muted-foreground hover:text-foreground transition-colors">
                {t('stats.cancel')}
              </button>
              {state === 'error' && <span className="text-meta text-k-fragile ml-auto">{t('stats.error')}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
