import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SecurityRow {
  label: string
  status: 'safe' | 'never' | 'zero' | 'none' | 'warn' | 'na'
  badge: string
  value: string
}

function Badge({ status, text }: { status: string; text: string }) {
  if (status === 'never') {
    return <span className="font-bold text-red-500 mr-1">{text}</span>
  }
  if (status === 'safe' || status === 'zero' || status === 'none') {
    return (
      <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 mr-2 whitespace-nowrap">
        {text}
      </span>
    )
  }
  if (status === 'warn') {
    return (
      <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 mr-2 whitespace-nowrap">
        {text}
      </span>
    )
  }
  // na
  return <span className="text-muted-foreground/60 mr-1">{text}</span>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-widest text-muted-foreground/80 mb-2 mt-5 first:mt-0">
      {children}
    </p>
  )
}

function SecurityTable({ rows }: { rows: SecurityRow[] }) {
  return (
    <table className="w-full border-collapse mb-1 text-xs">
      <tbody>
        {rows.map(row => (
          <tr key={row.label}>
            <td className="py-2 px-3 border border-border/60 font-semibold bg-muted/20 align-top w-[36%] text-foreground/90 whitespace-nowrap">
              {row.label}
            </td>
            <td className="py-2 px-3 border border-border/60 align-top text-muted-foreground/90 leading-relaxed">
              <Badge status={row.status} text={row.badge} />
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
          <p className="text-xs text-muted-foreground/80 mt-0.5">{t('securitySubtitle')}</p>
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
      <SecurityTable rows={dataRows} />

      <SectionLabel>{t('securityNetworkTitle')}</SectionLabel>
      <SecurityTable rows={networkRows} />

      <SectionLabel>{t('securityGdprTitle')}</SectionLabel>
      <SecurityTable rows={gdprRows} />

      <SectionLabel>{t('securityVerifyTitle')}</SectionLabel>
      <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 mb-4">
        <p className="text-xs text-muted-foreground/90 mb-2.5">{t('securityVerifyIntro')}</p>
        <ol className="space-y-1.5">
          {verifySteps.map((step, i) => (
            <li key={i} className="text-xs text-foreground flex gap-2">
              <span className="text-muted-foreground/50 flex-shrink-0 select-none">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <p className="text-[10px] text-muted-foreground/60">{t('securitySourceNote')}</p>
      <p className="text-[10px] text-muted-foreground/40 mt-0.5">{t('securitySourceFile')}</p>
    </div>
  )
}
