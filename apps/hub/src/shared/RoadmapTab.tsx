import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@clerk/clerk-react'
import apiClient from '../api/client'

type RoadmapItem = { title: string; desc: string }
type DoneGroup   = { group: string; items: RoadmapItem[] }

function toKey(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function SectionDivider({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={`h-px flex-1 ${accent ? 'bg-primary/30' : 'bg-border'}`} />
      <p className={`text-[9px] uppercase tracking-widest font-medium ${accent ? 'text-foreground' : 'text-muted-foreground/50'}`}>
        {label}
      </p>
      <div className={`h-px flex-1 ${accent ? 'bg-primary/30' : 'bg-border'}`} />
    </div>
  )
}

function RoadmapRow({ prefix, title, desc, action }: {
  prefix: string
  title: string
  desc: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-baseline gap-2 py-1 border-b border-border/20 last:border-0">
      <span className="text-muted-foreground/40 text-xs flex-shrink-0 w-3">{prefix}</span>
      <span className="text-xs text-foreground w-36 flex-shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">{title}</span>
      <span className="text-xs text-muted-foreground/75 flex-1">{desc}</span>
      {action}
    </div>
  )
}

interface RoadmapTabProps {
  namespace: 'forge-me' | 'analyze-me'
}

export function RoadmapTab({ namespace }: RoadmapTabProps) {
  const { t } = useTranslation(namespace)
  const { isSignedIn, getToken } = useAuth()

  const [counts, setCounts]       = useState<Record<string, number>>({})
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set())
  const [pending, setPending]     = useState<Set<string>>(new Set())
  const [loginHint, setLoginHint] = useState(false)

  const [suggestText, setSuggestText]     = useState('')
  const [showUsername, setShowUsername]   = useState(true)
  const [submitting, setSubmitting]       = useState(false)
  const [submitted, setSubmitted]         = useState(false)
  const [submitError, setSubmitError]     = useState(false)

  // Fetch vote counts on mount
  useEffect(() => {
    const load = async () => {
      try {
        const headers: Record<string, string> = {}
        if (isSignedIn) {
          const token = await getToken()
          if (token) headers['Authorization'] = `Bearer ${token}`
        }
        const res = await apiClient.get(`/api/roadmap/${namespace}/votes`, { headers })
        setCounts(res.data.counts ?? {})
        setUserVotes(new Set(res.data.user_votes ?? []))
      } catch {}
    }
    load()
  }, [namespace, isSignedIn, getToken])

  const handleVote = useCallback(async (title: string) => {
    if (!isSignedIn) {
      setLoginHint(true)
      setTimeout(() => setLoginHint(false), 3000)
      return
    }

    const key = toKey(title)
    if (pending.has(key)) return

    const voted = userVotes.has(key)

    // Optimistic update
    setCounts(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) + (voted ? -1 : 1)) }))
    setUserVotes(prev => {
      const next = new Set(prev)
      voted ? next.delete(key) : next.add(key)
      return next
    })
    setPending(prev => new Set(prev).add(key))

    try {
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }
      if (voted) {
        await apiClient.delete(`/api/roadmap/${namespace}/vote/${key}`, { headers })
      } else {
        await apiClient.post(`/api/roadmap/${namespace}/vote/${key}`, {}, { headers })
      }
    } catch (err: any) {
      // 409 = already voted on server, keep optimistic state as-is
      if (err?.response?.status !== 409) {
        // Rollback on real errors
        setCounts(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) + (voted ? 1 : -1)) }))
        setUserVotes(prev => {
          const next = new Set(prev)
          voted ? next.add(key) : next.delete(key)
          return next
        })
      }
    } finally {
      setPending(prev => { const next = new Set(prev); next.delete(key); return next })
    }
  }, [isSignedIn, userVotes, pending, namespace, getToken])

  const handleSubmit = async () => {
    if (!isSignedIn || !suggestText.trim() || submitting) return
    setSubmitting(true)
    setSubmitError(false)
    try {
      const token = await getToken()
      await apiClient.post('/api/suggestions', {
        module_id: namespace,
        text: suggestText.trim(),
        show_username: showUsername,
      }, { headers: { Authorization: `Bearer ${token}` } })
      setSubmitted(true)
      setSuggestText('')
    } catch {
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl pb-8">

      {/* Done */}
      <div className="mb-6">
        <SectionDivider label={t('doneLabel')} accent />
        {(t('done', { returnObjects: true }) as DoneGroup[]).map((group, gi) => (
          <div key={group.group} className="mb-2">
            {gi > 0 && <div className="mt-4" />}
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-1">
              {group.group}
            </p>
            {group.items.map(item => (
              <RoadmapRow key={item.title} prefix="✓" title={item.title} desc={item.desc} />
            ))}
          </div>
        ))}
      </div>

      {/* Next / voting */}
      <div className="mb-6">
        <SectionDivider label={t('nextLabel')} accent />
        <p className="text-[10px] text-muted-foreground/50 mb-3 leading-relaxed">
          {t('nextDesc')}
        </p>
        {loginHint && (
          <p className="text-[10px] text-muted-foreground/60 mb-2 italic">
            Sign in to vote on roadmap items
          </p>
        )}
        {(t('next', { returnObjects: true }) as RoadmapItem[]).map(item => {
          const key     = toKey(item.title)
          const voted   = userVotes.has(key)
          const count   = counts[key] ?? 0
          const loading = pending.has(key)
          return (
            <RoadmapRow
              key={item.title}
              prefix="→"
              title={item.title}
              desc={item.desc}
              action={
                <button
                  onClick={() => handleVote(item.title)}
                  disabled={loading}
                  className={`text-[10px] flex-shrink-0 flex items-center gap-1 transition-colors disabled:opacity-40 ${
                    voted
                      ? 'text-primary hover:text-primary/70'
                      : 'text-muted-foreground/40 hover:text-foreground'
                  }`}
                >
                  ▲ {count > 0 ? count : 'vote'}
                </button>
              }
            />
          )
        })}
      </div>

      {/* Later */}
      <div className="mb-6">
        <SectionDivider label={t('laterLabel')} />
        {(t('later', { returnObjects: true }) as RoadmapItem[]).map(item => (
          <RoadmapRow key={item.title} prefix="·" title={item.title} desc={item.desc} />
        ))}
      </div>

      {/* Suggest */}
      <div>
        <SectionDivider label={t('suggestLabel')} />
        {submitted ? (
          <p className="text-[11px] text-muted-foreground/60 py-2">
            Thanks — your suggestion is under review. We'll email you when it's published.
          </p>
        ) : (
          <>
            <textarea
              value={suggestText}
              onChange={e => setSuggestText(e.target.value)}
              maxLength={300}
              placeholder={t('suggestPlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
            />
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 text-[10px] text-muted-foreground/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUsername}
                  onChange={e => setShowUsername(e.target.checked)}
                  className="rounded"
                />
                {t('suggestUsernameLabel')}
              </label>
              <p className="text-[10px] text-muted-foreground/40">{t('suggestHint')}</p>
            </div>
            {submitError && (
              <p className="text-[10px] text-red-400 mt-1">Something went wrong, try again.</p>
            )}
            <button
              onClick={isSignedIn ? handleSubmit : () => { setLoginHint(true); setTimeout(() => setLoginHint(false), 3000) }}
              disabled={submitting || (isSignedIn === true && !suggestText.trim())}
              className="mt-3 px-4 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-40"
            >
              {submitting ? 'Sending...' : t('suggestSubmit')}
            </button>
            {!isSignedIn && (
              <p className="text-[10px] text-muted-foreground/40 mt-1">Sign in to submit suggestions</p>
            )}
          </>
        )}
      </div>

    </div>
  )
}
