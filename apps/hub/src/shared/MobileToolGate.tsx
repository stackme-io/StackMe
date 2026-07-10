import { useTranslation } from 'react-i18next'

// Mobile-only gate for the beta tools. Their working surfaces (file drops, wide
// tables, side panels) are desktop-first, so on a narrow screen we show a short
// description + "best on desktop" note instead of a broken layout. Roadmap and
// stack tabs stay reachable and readable. descKey points at a common-namespace
// one-liner (modules.<id>.description).
export function MobileToolGate({ descKey }: { descKey: string }) {
  const { t } = useTranslation()
  return (
    <div className="md:hidden py-6">
      <div className="rounded-xl border border-border bg-muted/20 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide border border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-700/50 dark:bg-violet-900/40 dark:text-violet-300">beta</span>
          <span className="text-sm font-medium text-foreground">{t('mobileGate.bestOnDesktop')}</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{t(descKey)}</p>
        <p className="text-sm text-muted-foreground/90 leading-relaxed border-t border-border/50 pt-3">{t('mobileGate.note')}</p>
        <p className="text-xs text-muted-foreground/80">{t('mobileGate.roadmapHint')}</p>
      </div>
    </div>
  )
}
