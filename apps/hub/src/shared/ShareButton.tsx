import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Share2, Link as LinkIcon } from 'lucide-react'

// Share affordance for the hub header. Shares the clean canonical URL only - never any
// tool data. A small branded popover (Copy link + a few dev channels), no OS share sheet.
const CANONICAL_ORIGIN = 'https://stackme-app.vercel.app'

function canonicalUrl(): string {
  const p = window.location.pathname
  return `${CANONICAL_ORIGIN}${p === '/' ? '' : p}`
}

export default function ShareButton({ note }: { note: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const onTrigger = () => setOpen(o => !o)

  const copy = () => {
    navigator.clipboard?.writeText(canonicalUrl())
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
      .catch(() => {})
  }

  const url = canonicalUrl()
  const title = document.title
  const intents = [
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` },
    { label: 'Reddit', href: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}` },
    { label: 'Hacker News', href: `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(url)}&t=${encodeURIComponent(title)}` },
  ]

  return (
    <div className="relative" ref={ref}>
      <button onClick={onTrigger} title={t('share.button')} aria-label={t('share.button')}
        className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
        <Share2 className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-60 rounded-md border border-border bg-card shadow-lg z-50 p-1.5">
          <button onClick={copy}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-foreground hover:bg-muted transition-colors">
            <LinkIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {copied ? t('share.copied') : t('share.copyLink')}
          </button>
          {intents.map(it => (
            <a key={it.label} href={it.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-foreground hover:bg-muted transition-colors">
              <span className="w-3.5 text-center text-muted-foreground flex-shrink-0">↗</span>
              {it.label}
            </a>
          ))}
          <p className="text-xs text-muted-foreground leading-snug px-2 pt-2 pb-1 mt-1 border-t border-border">{note}</p>
        </div>
      )}
    </div>
  )
}
