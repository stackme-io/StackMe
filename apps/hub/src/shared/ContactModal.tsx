import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import apiClient from '../api/client'

const CATEGORIES = ['bug', 'idea', 'partnership', 'other'] as const
type Category = typeof CATEGORIES[number]

export default function ContactModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState<Category | ''>('')
  const [website, setWebsite] = useState('') // honeypot
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const canSend = message.trim().length >= 10 && state !== 'sending'

  const send = async () => {
    if (!canSend) return
    setState('sending')
    try {
      await apiClient.post('/api/contact', {
        message: message.trim(),
        email: email.trim() || null,
        category: category || null,
        website: website || null,
      })
      setState('sent')
      setTimeout(onClose, 1400)
    } catch {
      setState('error')
    }
  }

  const label = (c: Category) => t(`contact.cat${c.charAt(0).toUpperCase()}${c.slice(1)}`)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
        <div className="flex items-start justify-between mb-1">
          <p className="text-sm font-medium text-foreground">{t('contact.title')}</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground -mr-1 -mt-1" aria-label={t('contact.cancel')}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t('contact.lead')}</p>

        {state === 'sent' ? (
          <p className="text-sm text-foreground py-6 text-center">{t('contact.sent')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(category === c ? '' : c)}
                  className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${category === c ? 'border-primary text-foreground bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                  {label(c)}
                </button>
              ))}
            </div>

            <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} rows={4} autoFocus
              placeholder={t('contact.messagePlaceholder')}
              className="w-full bg-muted/30 border border-border rounded-md p-3 text-sm text-foreground resize-y focus:outline-none focus:border-foreground/40" />

            <input value={email} onChange={e => setEmail(e.target.value)} type="email" maxLength={255}
              placeholder={t('contact.emailPlaceholder')}
              className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/40" />

            {/* honeypot - hidden from real users, bots fill it */}
            <input value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off"
              className="hidden" aria-hidden="true" />

            {state === 'error' && <p className="text-xs text-destructive">{t('contact.error')}</p>}

            <div className="flex justify-end gap-2 mt-1">
              <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors">
                {t('contact.cancel')}
              </button>
              <button onClick={send} disabled={!canSend}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {state === 'sending' ? t('contact.sending') : t('contact.send')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
