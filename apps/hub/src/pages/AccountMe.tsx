import { useState, useEffect } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'

const ADMIN_USER_ID = import.meta.env.VITE_ADMIN_USER_ID

type NotifType = 'announcement' | 'new_version' | 'survey'

function AdminPanel({ getToken }: { getToken: () => Promise<string | null> }) {
  const { t } = useTranslation()
  const [title, setTitle]   = useState('')
  const [body, setBody]     = useState('')
  const [type, setType]     = useState<NotifType>('announcement')
  const [sending, setSending] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState(false)

  const handleSend = async () => {
    if (!title.trim() || sending) return
    setSending(true)
    setError(false)
    try {
      const token = await getToken()
      await apiClient.post('/api/admin/notifications', {
        type,
        title: title.trim(),
        body: body.trim() || null,
      }, { headers: { Authorization: `Bearer ${token}` } })
      setSent(true)
      setTitle('')
      setBody('')
      setTimeout(() => setSent(false), 3000)
    } catch {
      setError(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/10">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/95 font-medium">
        {t('account.adminLabel')}
      </p>

      <div className="flex gap-1">
        {(['announcement', 'new_version', 'survey'] as NotifType[]).map(notifType => (
          <button
            key={notifType}
            onClick={() => setType(notifType)}
            className={`px-2.5 py-1 rounded-md text-[10px] border transition-colors ${
              type === notifType
                ? 'border-primary/50 bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:bg-muted/30'
            }`}
          >
            {notifType === 'announcement' ? t('account.typeAnnouncement') : notifType === 'new_version' ? t('account.typeVersion') : t('account.typeSurvey')}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        maxLength={255}
        placeholder={t('account.titlePlaceholder')}
        className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        maxLength={2000}
        placeholder={t('account.bodyPlaceholder')}
        rows={3}
        className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
      />

      {error && <p className="text-[10px] text-red-400">{t('account.errorGeneric')}</p>}

      <button
        onClick={handleSend}
        disabled={sending || !title.trim()}
        className="self-start px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {sent ? t('account.sent') : sending ? t('account.sending') : t('account.sendToAll')}
      </button>
    </div>
  )
}

export default function AccountMePage() {
  const { t } = useTranslation()
  const { user } = useUser()
  const { getToken } = useAuth()
  const [nickname, setNickname]       = useState('')
  const [savedNickname, setSavedNickname] = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    try {
      const token = await getToken()
      const res = await apiClient.get('/api/me/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSavedNickname(res.data.nickname)
      setNickname(res.data.nickname ?? '')
    } catch {}
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = await getToken()
      await apiClient.patch('/api/me/profile', { nickname }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSavedNickname(nickname)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      if (err?.response?.status === 409) {
        alert(t('account.nicknameTaken'))
      }
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  const userId   = user.id
  const email    = user.emailAddresses[0]?.emailAddress
  const avatarUrl = user.imageUrl
  const displayName = user.fullName ?? user.firstName ?? email
  const isAdmin  = ADMIN_USER_ID && userId === ADMIN_USER_ID

  return (
    <div className="max-w-xl mx-auto px-6 py-8 flex flex-col gap-8">

      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="w-14 h-14 rounded-full" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-medium text-primary">
            {email?.[0]?.toUpperCase() ?? 'U'}
          </div>
        )}
        <div>
          <p className="text-base font-medium text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">{userId}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('account.emailLabel')}</label>
        <div className="px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground select-none">
          {email}
        </div>
        <p className="text-[11px] text-muted-foreground/95">
          {t('account.emailNote')}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('account.nicknameLabel')}</label>
        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          maxLength={50}
          placeholder={t('account.nicknamePlaceholder')}
          className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground/95">
          {t('account.nicknameNote')}
        </p>
        <button
          onClick={handleSave}
          disabled={saving || nickname === savedNickname}
          className="self-start mt-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saved ? t('account.saved') : saving ? t('account.saving') : t('account.save')}
        </button>
      </div>

      {isAdmin && <AdminPanel getToken={getToken} />}

    </div>
  )
}
