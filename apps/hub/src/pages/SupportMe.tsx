import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Heart, Coffee, Copy, Check } from 'lucide-react'
import GithubMark from '../shared/GithubMark'

// Fill these in once the accounts exist. An empty string hides that card, so the page
// is publishable before any of them are set up.
// No third-party widgets here on purpose: Ko-fi / Buy Me a Coffee embeds ship tracking
// scripts, and "no trackers" is a claim we make on every other page.
const GITHUB_SPONSORS = ''  // https://github.com/sponsors/<user>
const KOFI            = ''  // https://ko-fi.com/<user>

// A Tron address takes both native TRX and TRC20 tokens like USDT, so it is labelled for
// both. The network is shown on purpose: USDT also exists on ERC20 and BEP20, and funds
// sent on the wrong network are unrecoverable.
const CRYPTO: { label: string; network: string; address: string }[] = [
  { label: 'USDT / TRX', network: 'TRC20 · Tron', address: 'TG4hY9LhPvd2YxE3F7TzDp6qgXrJxaadYS' },
]

// Generate once and commit the file, then set this path:
//   npx qrcode -o apps/hub/public/donate-trc20.svg -t svg "<address>"
// Then scan the result and verify it resolves to the exact address before shipping.
// Never point this at an external QR service: that is a third-party request on every page
// load, and it would contradict the "nothing leaves your browser" claim.
const CRYPTO_QR = '/donate-trc20.svg'

function CryptoRow({ label, network, address }: { label: string; network: string; address: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard?.writeText(address)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
      .catch(() => {})
  }

  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 items-start">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sub font-medium text-foreground">{label}</span>
          <span className="text-meta text-[var(--tool-accent,#22d3ee)]">{network}</span>
        </div>
        <code className="text-code text-content break-all">{address}</code>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-meta text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 transition-colors"
        >
          {copied
            ? <><Check className="w-3 h-3" />{t('support.copied')}</>
            : <><Copy className="w-3 h-3" />{t('support.copy')}</>}
        </button>
      </div>
      {CRYPTO_QR && (
        <img
          src={CRYPTO_QR}
          alt=""
          aria-hidden="true"
          className="w-[92px] h-[92px] flex-shrink-0 self-start sm:self-center rounded bg-white p-1.5"
        />
      )}
    </div>
  )
}

export default function SupportMePage() {
  const { t } = useTranslation()
  const hasLinks = !!GITHUB_SPONSORS || !!KOFI || CRYPTO.length > 0

  const card = 'flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors'

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-muted-foreground" />
          <h1 className="text-title text-foreground">{t('support.title')}</h1>
        </div>
        <p className="text-body text-content leading-relaxed">{t('support.lead')}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-label text-muted-foreground">{t('support.whatForTitle')}</h2>
        <p className="text-body text-content leading-relaxed">{t('support.whatFor')}</p>
        <p className="text-body text-content leading-relaxed">{t('support.staysFree')}</p>
      </div>

      {hasLinks && (
        <div className="flex flex-col gap-3">
          <h2 className="text-label text-muted-foreground">{t('support.waysTitle')}</h2>

          {GITHUB_SPONSORS && (
            <a href={GITHUB_SPONSORS} target="_blank" rel="noopener noreferrer" className={card}>
              <GithubMark className="w-4 h-4 text-foreground flex-shrink-0 mt-0.5" />
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-body font-medium text-foreground">{t('support.githubTitle')}</span>
                <span className="text-sub text-muted-foreground">{t('support.githubDesc')}</span>
              </span>
            </a>
          )}

          {KOFI && (
            <a href={KOFI} target="_blank" rel="noopener noreferrer" className={card}>
              <Coffee className="w-4 h-4 text-foreground flex-shrink-0 mt-0.5" />
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-body font-medium text-foreground">{t('support.kofiTitle')}</span>
                <span className="text-sub text-muted-foreground">{t('support.kofiDesc')}</span>
              </span>
            </a>
          )}

          {CRYPTO.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sub text-muted-foreground">{t('support.cryptoDesc')}</p>
              {CRYPTO.map(c => (
                <CryptoRow key={c.label} label={c.label} network={c.network} address={c.address} />
              ))}
              <p className="text-meta text-faint">{t('support.cryptoWarn')}</p>
            </div>
          )}
        </div>
      )}

      {/* Three separate keys, not one paragraph: they are three independent asks, they
          render as a list, and a translator gets three short strings instead of a blob. */}
      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="text-label text-muted-foreground">{t('support.freeTitle')}</h2>
        <ul className="flex flex-col gap-2">
          {(['freeWaysStar', 'freeWaysReport', 'freeWaysTell'] as const).map(k => (
            <li key={k} className="flex gap-2.5 text-body text-content leading-relaxed">
              <span className="text-muted-foreground flex-shrink-0" aria-hidden="true">-</span>
              <span className="min-w-0">{t(`support.${k}`)}</span>
            </li>
          ))}
        </ul>
        <a
          href="https://github.com/stackme-io/StackMe"
          target="_blank"
          rel="noopener noreferrer"
          className="text-body text-[var(--tool-accent,#22d3ee)] hover:underline self-start inline-flex items-center gap-1.5"
        >
          {t('support.repoLink')}
          <span aria-hidden="true">→</span>
        </a>
      </div>

    </div>
  )
}
