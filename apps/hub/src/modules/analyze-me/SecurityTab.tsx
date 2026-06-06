import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SecurityRow {
  label: string
  status: 'safe' | 'yes' | 'never' | 'zero' | 'none' | 'warn' | 'na'
  badge: string
  value: string
}

const C = {
  text:         '#1a1a1a',
  textMuted:    '#555555',
  textLight:    '#888888',
  border:       '#e5e5e5',
  borderHeader: '#111111',
  cellBg:       '#fafafa',
  green:        '#059669',
  greenBg:      '#ecfdf5',
  greenBorder:  '#d1fae5',
  red:          '#dc2626',
  amber:        '#92400e',
  amberBg:      '#fefce8',
  amberBorder:  '#fde68a',
  noteBg:       '#f8f8f8',
  noteBorder:   '#d1d5db',
  verifyBg:     '#f0fdf4',
  verifyBorder: '#bbf7d0',
}

function Badge({ status, text }: { status: string; text: string }) {
  if (status === 'never') return <span style={{ color: C.red, fontWeight: 700 }}>{text} </span>
  if (status === 'yes')   return <span style={{ color: C.green, fontWeight: 700 }}>{text} </span>
  if (status === 'safe' || status === 'zero' || status === 'none') {
    return (
      <span style={{
        display: 'inline-block', fontSize: 13, fontWeight: 600,
        padding: '2px 10px', borderRadius: 4, marginRight: 8,
        background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}`,
      }}>{text}</span>
    )
  }
  if (status === 'warn') {
    return (
      <span style={{
        display: 'inline-block', fontSize: 13, fontWeight: 600,
        padding: '2px 10px', borderRadius: 4, marginRight: 8,
        background: C.amberBg, color: C.amber, border: `1px solid ${C.amberBorder}`,
      }}>{text}</span>
    )
  }
  return <span style={{ color: C.textLight, fontWeight: 600, marginRight: 6 }}>{text}</span>
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
      textTransform: 'uppercase', color: C.textMuted,
      margin: '32px 0 12px',
    }}>
      {children}
    </h2>
  )
}

function SecurityTable({ rows }: { rows: SecurityRow[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
      <tbody>
        {rows.map(row => (
          <tr key={row.label}>
            <td style={{
              width: '36%', padding: '11px 14px',
              border: `1px solid ${C.border}`,
              fontWeight: 600, background: C.cellBg,
              verticalAlign: 'top', whiteSpace: 'nowrap',
              fontSize: 14, color: C.text,
            }}>
              {row.label}
            </td>
            <td style={{
              padding: '11px 14px', border: `1px solid ${C.border}`,
              verticalAlign: 'top', fontSize: 14,
              lineHeight: 1.65, color: C.text,
            }}>
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
  const [verifyOpen, setVerifyOpen] = useState(true)

  const dataRows    = t('securityData',    { returnObjects: true }) as SecurityRow[]
  const networkRows = t('securityNetwork', { returnObjects: true }) as SecurityRow[]
  const hostingRows = t('securityHosting', { returnObjects: true }) as SecurityRow[]
  const gdprRows    = t('securityGdpr',    { returnObjects: true }) as SecurityRow[]
  const verifySteps = t('securityVerifySteps', { returnObjects: true }) as string[]

  const handleShare = () => {
    const url = `${window.location.origin}/analyze-me?tab=security`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handlePrint = () => {
    const style = document.createElement('style')
    style.id = '__security_print_style'
    style.textContent = `
      @media print {
        html, body { height: auto !important; overflow: visible !important; background: white !important; }
        .overflow-y-auto { overflow: visible !important; height: auto !important; max-height: none !important; }
        .overflow-hidden { overflow: visible !important; height: auto !important; }
        .flex-1 { flex: none !important; height: auto !important; }
        [data-no-print] { display: none !important; }
      }
    `
    document.head.appendChild(style)
    window.addEventListener('afterprint', () => style.remove(), { once: true })
    window.print()
  }

  return (
    // Серый фон — самодостаточный, не зависит от темы приложения
    <div style={{ minHeight: '100%', background: '#0f0f0f', padding: '24px 24px 48px', display: 'flex', justifyContent: 'center' }}>
      {/* Белая карточка-документ */}
      <div style={{
        background: '#ffffff',
        borderRadius: 4,
        boxShadow: '0 1px 4px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)',
        padding: '56px 48px',
        width: '100%',
        maxWidth: 920,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: 15,
        lineHeight: 1.65,
        color: C.text,
      }}>

        {/* Header */}
        <div style={{
          borderBottom: `2px solid ${C.borderHeader}`,
          paddingBottom: 16, marginBottom: 28,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.4px', color: C.text, margin: 0 }}>
              {t('securityTitle')}
            </h1>
            <p style={{ color: C.textMuted, marginTop: 6, fontSize: 14, margin: '6px 0 0' }}>
              {t('securityFor')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
            <button onClick={handleShare} style={{
              fontSize: 13, color: C.textMuted, border: `1px solid ${C.border}`,
              borderRadius: 4, padding: '5px 14px', background: '#fff', cursor: 'pointer',
            }}>
              {copied ? t('securityCopied') : t('securityShare')}
            </button>
            <button onClick={handlePrint} style={{
              fontSize: 13, color: C.textMuted, border: `1px solid ${C.border}`,
              borderRadius: 4, padding: '5px 14px', background: '#fff', cursor: 'pointer',
            }}>
              {t('securityPrint')}
            </button>
          </div>
        </div>

        {/* Verification box — первым, сворачиваемый */}
        <div style={{
          marginBottom: 32,
          background: C.verifyBg, border: `1px solid ${C.verifyBorder}`, borderRadius: 6,
        }}>
          {/* Шапка: заголовок (всегда) + chevron (только на экране) */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 0', gap: 8 }}>
            <p style={{ fontSize: 14, color: C.text, fontWeight: 600, margin: 0, flex: 1 }}>
              {t('securityVerifyTitle')}
            </p>
            <button
              data-no-print
              onClick={() => setVerifyOpen(o => !o)}
              title={verifyOpen ? 'Collapse' : 'Expand'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                color: C.textLight, fontSize: 11, flexShrink: 0,
                transform: verifyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                display: 'inline-block', transition: 'transform 0.2s',
              }}
            >▼</button>
          </div>
          {verifyOpen && (
            <div style={{ padding: '8px 16px 14px' }}>
              <p style={{ fontSize: 14, color: C.text, margin: '0 0 10px' }}>
                {t('securityVerifyIntro')}
              </p>
              {verifySteps.map((step, i) => (
                <p key={i} style={{ fontSize: 14, color: C.text, margin: '0 0 4px' }}>
                  {i + 1}. {step}
                </p>
              ))}
            </div>
          )}
        </div>

        <H2>{t('securityDataTitle')}</H2>
        <SecurityTable rows={dataRows} />

        <H2>{t('securityNetworkTitle')}</H2>
        <SecurityTable rows={networkRows} />

        <H2>{t('securityHostingTitle')}</H2>
        <SecurityTable rows={hostingRows} />

        <H2>{t('securityGdprTitle')}</H2>
        <SecurityTable rows={gdprRows} />

        {/* Note */}
        <p style={{
          fontSize: 13, color: C.textMuted, marginTop: 20,
          padding: '12px 16px', background: C.noteBg,
          borderLeft: `3px solid ${C.noteBorder}`, lineHeight: 1.65,
        }}>
          {t('securityNote')}
        </p>

        {/* Footer — без даты */}
        <div style={{
          marginTop: 40, paddingTop: 16,
          borderTop: `1px solid ${C.border}`,
          fontSize: 13, color: C.textLight,
        }}>
          {t('securityFooter')}
        </div>

      </div>
    </div>
  )
}
