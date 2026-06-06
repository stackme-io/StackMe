import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SecurityRow {
  label: string
  status: 'safe' | 'never' | 'zero' | 'none' | 'warn' | 'na'
  value: string
}

const STATUS_DOT: Record<string, string> = {
  safe:  'bg-emerald-500',
  never: 'bg-red-500',
  zero:  'bg-emerald-500',
  none:  'bg-emerald-500',
  warn:  'bg-amber-400',
  na:    'bg-muted-foreground/30',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-widest text-muted-foreground/95 mb-2 mt-5 first:mt-0">
      {children}
    </p>
  )
}

function Row({ row }: { row: SecurityRow }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px] ${STATUS_DOT[row.status] ?? 'bg-muted-foreground/30'}`} />
      <span className="text-xs text-muted-foreground/90 w-44 flex-shrink-0 leading-relaxed">{row.label}</span>
      <span className="text-xs text-foreground leading-relaxed">{row.value}</span>
    </div>
  )
}

export function SecurityTab() {
  const { t } = useTranslation('analyze-me')
  const [copied, setCopied] = useState(false)

  const dataRows    = t('securityData',    { returnObjects: true }) as SecurityRow[]
  const networkRows = t('securityNetwork', { returnObjects: true }) as SecurityRow[]
  const gdprRows    = t('securityGdpr',    { returnObjects: true }) as SecurityRow[]
  const verifySteps = t('securityVerifySteps', { returnObjects: true }) as string[]

  const handleShare = () => {
    const url = `${window.location.origin}/analyze-me?tab=security`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handlePrint = () => window.print()

  return (
    <div className="max-w-2xl pb-8">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('securityTitle')}</h2>
          <p className="text-xs text-muted-foreground/90 mt-0.5">{t('securitySubtitle')}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 ml-4">
          <button
            onClick={handleShare}
            className="text-[11px] text-muted-foreground hover:text-foreground border border-border/60 rounded px-2.5 py-1 transition-colors"
          >
            {copied ? t('securityCopied') : t('securityShare')}
          </button>
          <button
            onClick={handlePrint}
            className="text-[11px] text-muted-foreground hover:text-foreground border border-border/60 rounded px-2.5 py-1 transition-colors"
          >
            {t('securityPrint')}
          </button>
        </div>
      </div>

      <SectionLabel>{t('securityDataTitle')}</SectionLabel>
      <div className="mb-2">
        {dataRows.map(row => <Row key={row.label} row={row} />)}
      </div>

      <SectionLabel>{t('securityNetworkTitle')}</SectionLabel>
      <div className="mb-2">
        {networkRows.map(row => <Row key={row.label} row={row} />)}
      </div>

      <SectionLabel>{t('securityGdprTitle')}</SectionLabel>
      <div className="mb-2">
        {gdprRows.map(row => <Row key={row.label} row={row} />)}
      </div>

      <SectionLabel>{t('securityVerifyTitle')}</SectionLabel>
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 mb-4">
        <p className="text-xs text-muted-foreground/90 mb-2.5">{t('securityVerifyIntro')}</p>
        <ol className="space-y-1.5">
          {verifySteps.map((step, i) => (
            <li key={i} className="text-xs text-foreground flex gap-2">
              <span className="text-muted-foreground/50 flex-shrink-0">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <p className="text-[10px] text-muted-foreground/70">{t('securitySourceNote')}</p>
      <p className="text-[10px] text-muted-foreground/50 mt-0.5">{t('securitySourceFile')}</p>
    </div>
  )
}
