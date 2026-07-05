import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@clerk/clerk-react'
import apiClient from '../api/client'

type RoadmapItem    = { title: string; desc: string }
type DoneGroup      = { group: string; items: RoadmapItem[] }
type CommSuggestion = {
  id: number
  text: string
  display_name: string
  created_at: string
  vote_count: number
  user_voted: boolean
}

function toKey(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function SectionDivider({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={`h-px flex-1 ${accent ? 'bg-primary/30' : 'bg-border'}`} />
      <p className={`text-label ${accent ? 'text-foreground' : 'text-muted-foreground/95'}`}>
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
    <div className="py-2 border-b border-border/20 last:border-0">
      <div className="flex items-baseline gap-2">
        <span className="text-muted-foreground/40 text-body flex-shrink-0 w-3">{prefix}</span>
        <span className="text-body font-semibold text-foreground flex-1">{title}</span>
        {action}
      </div>
      <p className="text-sub text-muted-foreground/95 mt-0.5 pl-5">{desc}</p>
    </div>
  )
}

interface RoadmapTabProps {
  namespace: 'forge-me' | 'analyze-me' | 'locate-me'
}

export function RoadmapTab({ namespace }: RoadmapTabProps) {
  const { t }                   = useTranslation(namespace)
  const { isSignedIn, getToken } = useAuth()

  // Roadmap votes
  const [counts, setCounts]       = useState<Record<string, number>>({})
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set())
  const [pending, setPending]     = useState<Set<string>>(new Set())
  const [tooltip, setTooltip]     = useState<string | null>(null)

  // Later collapsed
  const [laterOpen, setLaterOpen] = useState(false)

  // Community suggestions
  const [suggestions, setSuggestions]   = useState<CommSuggestion[]>([])
  const [suggPending, setSuggPending]   = useState<Set<number>>(new Set())

  // Suggest form
  const [suggestText, setSuggestText]   = useState('')
  const [showUsername, setShowUsername] = useState(true)
  const [submitting, setSubmitting]     = useState(false)
  const [submitted, setSubmitted]       = useState(false)
  const [submitError, setSubmitError]   = useState(false)

  // Fetch votes + suggestions on mount
  useEffect(() => {
    const load = async () => {
      try {
        const headers: Record<string, string> = {}
        if (isSignedIn) {
          const token = await getToken()
          if (token) headers['Authorization'] = `Bearer ${token}`
        }
        const [votesRes, suggRes] = await Promise.all([
          apiClient.get(`/api/roadmap/${namespace}/votes`, { headers }),
          apiClient.get(`/api/suggestions/${namespace}`, { headers }),
        ])
        setCounts(votesRes.data.counts ?? {})
        setUserVotes(new Set(votesRes.data.user_votes ?? []))
        setSuggestions(suggRes.data ?? [])
      } catch {}
    }
    load()
  }, [namespace, isSignedIn, getToken])

  // Show tooltip near a button, hide after 2.5s
  const showTooltip = useCallback((id: string) => {
    setTooltip(id)
    setTimeout(() => setTooltip(null), 2500)
  }, [])

  // Roadmap vote
  const handleVote = useCallback(async (title: string) => {
    const key = toKey(title)
    if (!isSignedIn) { showTooltip(`vote-${key}`); return }
    if (pending.has(key)) return

    const voted = userVotes.has(key)
    setCounts(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) + (voted ? -1 : 1)) }))
    setUserVotes(prev => { const n = new Set(prev); voted ? n.delete(key) : n.add(key); return n })
    setPending(prev => new Set(prev).add(key))

    try {
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }
      voted
        ? await apiClient.delete(`/api/roadmap/${namespace}/vote/${key}`, { headers })
        : await apiClient.post(`/api/roadmap/${namespace}/vote/${key}`, {}, { headers })
    } catch (err: any) {
      if (err?.response?.status !== 409) {
        setCounts(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) + (voted ? 1 : -1)) }))
        setUserVotes(prev => { const n = new Set(prev); voted ? n.add(key) : n.delete(key); return n })
      }
    } finally {
      setPending(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }, [isSignedIn, userVotes, pending, namespace, getToken, showTooltip])

  // Suggestion vote
  const handleSuggVote = useCallback(async (s: CommSuggestion) => {
    if (!isSignedIn) { showTooltip(`sugg-${s.id}`); return }
    if (suggPending.has(s.id)) return

    const voted = s.user_voted
    setSuggestions(prev => prev.map(x =>
      x.id === s.id
        ? { ...x, vote_count: Math.max(0, x.vote_count + (voted ? -1 : 1)), user_voted: !voted }
        : x
    ))
    setSuggPending(prev => new Set(prev).add(s.id))

    try {
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }
      voted
        ? await apiClient.delete(`/api/suggestions/${s.id}/vote`, { headers })
        : await apiClient.post(`/api/suggestions/${s.id}/vote`, {}, { headers })
    } catch (err: any) {
      if (err?.response?.status !== 409) {
        setSuggestions(prev => prev.map(x =>
          x.id === s.id
            ? { ...x, vote_count: Math.max(0, x.vote_count + (voted ? 1 : -1)), user_voted: voted }
            : x
        ))
      }
    } finally {
      setSuggPending(prev => { const n = new Set(prev); n.delete(s.id); return n })
    }
  }, [isSignedIn, suggPending, getToken, showTooltip])

  // Submit suggestion
  const handleSubmit = async () => {
    if (!suggestText.trim() || submitting) return
    if (!isSignedIn) { showTooltip('submit'); return }
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

  const doneGroups = t('done', { returnObjects: true }) as DoneGroup[]
  const doneMid = Math.ceil(doneGroups.length / 2)
  const renderDoneGroup = (group: DoneGroup) => (
    <div key={group.group} className="mb-4 last:mb-0">
      <p className="text-label text-muted-foreground/95 mb-1">{group.group}</p>
      {group.items.map(item => (
        <RoadmapRow key={item.title} prefix="✓" title={item.title} desc={item.desc} />
      ))}
    </div>
  )

  return (
    <div className="max-w-xl pb-8">

      {/* Done - two columns to shorten the list */}
      <div className="mb-6">
        <SectionDivider label={t('doneLabel')} accent />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <div>{doneGroups.slice(0, doneMid).map(renderDoneGroup)}</div>
          <div>{doneGroups.slice(doneMid).map(renderDoneGroup)}</div>
        </div>
      </div>

      {/* Coming up - with voting */}
      <div className="mb-6">
        <SectionDivider label={t('nextLabel')} accent />
        <p className="text-meta text-muted-foreground/95 mb-3 leading-relaxed">{t('nextDesc')}</p>
        {(t('next', { returnObjects: true }) as RoadmapItem[]).map(item => {
          const key   = toKey(item.title)
          const voted = userVotes.has(key)
          const count = counts[key] ?? 0
          const tipId = `vote-${key}`
          return (
            <div key={item.title} className="relative">
              <RoadmapRow
                prefix="→"
                title={item.title}
                desc={item.desc}
                action={
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => handleVote(item.title)}
                      disabled={pending.has(key)}
                      className={`text-meta flex items-center gap-1 transition-colors disabled:opacity-40 ${
                        voted ? 'text-primary hover:text-primary/70' : 'text-muted-foreground/40 hover:text-foreground'
                      }`}
                    >
                      ▲ {count > 0 ? count : 'vote'}
                    </button>
                    {tooltip === tipId && (
                      <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-popover border border-border rounded text-meta text-muted-foreground whitespace-nowrap shadow-sm z-10">
                        {t('signInToVote')}
                      </div>
                    )}
                  </div>
                }
              />
            </div>
          )
        })}
      </div>

      {/* Later - collapsed */}
      <div className="mb-6">
        <button
          onClick={() => setLaterOpen(o => !o)}
          className="w-full flex items-center gap-3 mb-3 group"
        >
          <div className="h-px flex-1 bg-border" />
          <p className="text-label text-muted-foreground/95 group-hover:text-muted-foreground transition-colors">
            {t('laterLabel')} {laterOpen ? '−' : '+'}
          </p>
          <div className="h-px flex-1 bg-border" />
        </button>
        {laterOpen && (t('later', { returnObjects: true }) as RoadmapItem[]).map(item => (
          <RoadmapRow key={item.title} prefix="·" title={item.title} desc={item.desc} />
        ))}
      </div>

      {/* From the community */}
      {suggestions.length > 0 && (
        <div className="mb-6">
          <SectionDivider label={t('fromCommunity')} accent />
          {suggestions.map(s => {
            const tipId = `sugg-${s.id}`
            return (
              <div key={s.id} className="flex items-start gap-2 py-1.5 border-b border-border/20 last:border-0">
                <span className="text-meta text-muted-foreground/80 flex-shrink-0 font-mono mt-0.5">
                  {s.display_name}
                </span>
                <span className="text-sub text-muted-foreground/95 flex-1 leading-relaxed">{s.text}</span>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => handleSuggVote(s)}
                    disabled={suggPending.has(s.id)}
                    className={`text-meta flex items-center gap-1 transition-colors disabled:opacity-40 ${
                      s.user_voted ? 'text-primary hover:text-primary/70' : 'text-muted-foreground/40 hover:text-foreground'
                    }`}
                  >
                    ▲ {s.vote_count > 0 ? s.vote_count : 'vote'}
                  </button>
                  {tooltip === tipId && (
                    <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-popover border border-border rounded text-meta text-muted-foreground whitespace-nowrap shadow-sm z-10">
                      {t('signInToVote')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Suggest a feature */}
      <div>
        <SectionDivider label={t('suggestLabel')} accent />
        {submitted ? (
          <p className="text-meta text-muted-foreground/95 py-2">
            {t('suggestionThanks')}
          </p>
        ) : (
          <>
            <textarea
              value={suggestText}
              onChange={e => setSuggestText(e.target.value)}
              maxLength={300}
              placeholder={t('suggestPlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-body resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
            />
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 text-meta text-muted-foreground/95 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUsername}
                  onChange={e => setShowUsername(e.target.checked)}
                  className="rounded"
                />
                {t('suggestUsernameLabel')}
              </label>
              <p className="text-meta text-muted-foreground/80">{t('suggestHint')}</p>
            </div>
            {submitError && (
              <p className="text-meta text-red-400 mt-1">{t('errorGeneric')}</p>
            )}
            <div className="relative inline-block mt-3">
              <button
                onClick={handleSubmit}
                disabled={submitting || (isSignedIn === true && !suggestText.trim())}
                className="px-4 py-1.5 rounded-lg border border-border text-body text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-40"
              >
                {submitting ? t('sending') : t('suggestSubmit')}
              </button>
              {tooltip === 'submit' && (
                <div className="absolute bottom-full left-0 mb-1.5 px-2 py-1 bg-popover border border-border rounded text-meta text-muted-foreground whitespace-nowrap shadow-sm z-10">
                  {t('signInToSubmit')}
                </div>
              )}
            </div>
            {!isSignedIn && (
              <p className="text-meta text-muted-foreground/80 mt-1">{t('signInToSubmit')}</p>
            )}
          </>
        )}
      </div>

    </div>
  )
}
