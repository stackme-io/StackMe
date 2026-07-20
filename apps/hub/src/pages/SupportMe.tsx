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

// { label: 'BTC', address: 'bc1...' }
const CRYPTO: { label: string; address: string }[] = []

function CryptoRow({ label, address }: { label: string; address: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard?.writeText(address)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
      .catch(() => {})
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-t border-border/50 first:border-t-0">
      <span className="text-label text-muted-foreground flex-shrink-0 w-12">{label}</span>
      <code className="flex-1 min-w-0 text-code text-content break-all">{address}</code>
      <button
        onClick={copy}
        className="flex-shrink-0 flex items-center gap-1 text-meta text-muted-foreground hover:text-foreground transition-colors"
      >
        {copied
          ? <><Check className="w-3.5 h-3.5" />{t('support.copied')}</>
          : <><Copy className="w-3.5 h-3.5" />{t('support.copy')}</>}
      </button>
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
              <div className="rounded-lg border border-border bg-muted/40 overflow-hidden">
                {CRYPTO.map(c => <CryptoRow key={c.label} label={c.label} address={c.address} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="text-label text-muted-foreground">{t('support.freeTitle')}</h2>
        <p className="text-body text-content leading-relaxed">{t('support.freeWays')}</p>
        <a
          href="https://github.com/stackme-io/StackMe"
          target="_blank"
          rel="noopener noreferrer"
          className="text-body text-[var(--tool-accent,#22d3ee)] hover:underline self-start"
        >
          {t('support.repoLink')}
        </a>
      </div>

    </div>
  )
}
