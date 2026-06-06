import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SecurityRow {
  label: string
  status: 'safe' | 'yes' | 'never' | 'zero' | 'none' | 'warn' | 'na'
  badge: string
  value: string
}

function Badge({ status, text }: { status: string; text: string }) {
  if (status === 'never') {
    return <span style={{ color: '#dc2626', fontWeight: 700 }}>{text} </span>
  }
  if (status === 'yes') {
    return <span style={{ color: '#059669', fontWeight: 700 }}>{text} </span>
  }
  if (status === 'safe' || status === 'zero' || status === 'none') {
    return (
      <span style={{
        display: 'inline-block', fontSize: 11, fontWeight: 600,
        padding: '1px 7px', borderRadius: 3, marginRight: 6,
        background: 'rgba(5,150,105,0.12)', color: '#059669',
        border: '1px solid rgba(5,150,105,0.3)',
      }}>{text}</span>
    )
  }
  if (status === 'warn') {
    return (
      <span style={{
        display: 'inline-block', fontSize: 11, fontWeight: 600,
        padding: '1px 7px', borderRadius: 3, marginRight: 6,
        background: 'rgba(217,119,6,0.1)', color: '#b45309',
        border: '1px solid rgba(217,119,6,0.3)',
      }}>{text}</span>
    )
  }
  // na
  return <span style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600, marginRight: 4 }}>{text} —</span>
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))',
      margin: '24px 0 10px', borderBottom: 'none',
    }}>
      {children}
    </h2>
  )
}

const CELL_LABEL: React.CSSProperties = {
  width: '38%',
  padding: '7px 10px',
  border: '1px solid hsl(var(--border))',
  fontWeight: 600,
  background: 'hsl(var(--muted) / 0.5)',
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
  fontSize: 12,
  color: 'hsl(var(--foreground))',
}

const CELL_VALUE: React.CSSProperties = {
  padding: '7px 10px',
  border: '1px solid hsl(var(--border))',
  verticalAlign: 'top',
  fontSize: 12,
  lineHeight: 1.6,
  color: 'hsl(var(--foreground) / 0.85)',
}

function SecurityTable({ rows }: { rows: SecurityRow[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
      <tbody>
        {rows.map(row => (
          <tr key={row.label}>
            <td style={CELL_LABEL}>{row.label}</td>
            <td style={CELL_VALUE}>
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

  const dataRows     = t('securityData',    { returnObjects: true }) as SecurityRow[]
  const networkRows  = t('securityNetwork', { returnObjects: true }) as SecurityRow[]
  const hostingRows  = t('securityHosting', { returnObjects: true }) as SecurityRow[]
  const gdprRows     = t('securityGdpr',    { returnObjects: true }) as SecurityRow[]
  const verifySteps  = t('securityVerifySteps', { returnObjects: true }) as string[]

  const handleShare = () => {
    const url = `${window.location.origin}/analyze-me?tab=security`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="max-w-2xl pb-8">

      {/* Header — точно как в security.html */}
      <div style={{
        borderBottom: '2px solid hsl(var(--foreground))',
        paddingBottom: 16,
        marginBottom: 28,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px', color: 'hsl(var(--foreground))' }}>
            {t('securityTitle')}
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: 4, fontSize: 12 }}>
            {t('securityFor')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
          <button
            onClick={handleShare}
            className="text-[11px] text-foreground border border-border rounded px-2.5 py-1 hover:bg-muted transition-colors"
          >
            {copied ? t('securityCopied') : t('securityShare')}
          </button>
          <button
            onClick={() => window.print()}
            className="text-[11px] text-foreground border border-border rounded px-2.5 py-1 hover:bg-muted transition-colors"
          >
            {t('securityPrint')}
          </button>
        </div>
      </div>

      <H2>{t('securityDataTitle')}</H2>
      <SecurityTable rows={dataRows} />

      <H2>{t('securityNetworkTitle')}</H2>
      <SecurityTable rows={networkRows} />

      <H2>{t('securityHostingTitle')}</H2>
      <SecurityTable rows={hostingRows} />

      <H2>{t('securityGdprTitle')}</H2>
      <SecurityTable rows={gdprRows} />

      {/* Devtools verification box */}
      <div style={{
        marginTop: 28,
        padding: '14px 16px',
        background: 'rgba(5,150,105,0.07)',
        border: '1px solid rgba(5,150,105,0.3)',
        borderRadius: 6,
      }}>
        <p style={{ fontSize: 12, color: 'hsl(var(--foreground))', marginBottom: 8 }}>
          <strong>{t('securityVerifyTitle')}</strong>
        </p>
        <p style={{ fontSize: 12, color: 'hsl(var(--foreground) / 0.8)', marginBottom: 8 }}>
          {t('securityVerifyIntro')}
        </p>
        <ol style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
          {verifySteps.map((step, i) => (
            <li key={i} style={{ fontSize: 12, color: 'hsl(var(--foreground))', marginBottom: 4, display: 'flex', gap: 8 }}>
              <span style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Note */}
      <p style={{
        fontSize: 11,
        color: 'hsl(var(--foreground) / 0.7)',
        marginTop: 16,
        padding: '8px 12px',
        background: 'hsl(var(--muted) / 0.4)',
        borderLeft: '3px solid hsl(var(--border))',
        lineHeight: 1.6,
      }}>
        {t('securityNote')}
      </p>

      {/* Footer */}
      <div style={{
        marginTop: 36,
        paddingTop: 14,
        borderTop: '1px solid hsl(var(--border))',
        fontSize: 11,
        color: 'hsl(var(--muted-foreground))',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>{t('securityFooter')}</span>
        <span>{new Date().toISOString().slice(0, 10)}</span>
      </div>

    </div>
  )
}
