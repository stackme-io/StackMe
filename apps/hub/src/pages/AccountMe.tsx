import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@clerk/clerk-react'
import apiClient from '../api/client'

export default function AccountMePage() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const { t } = useTranslation()
  const [nickname, setNickname] = useState('')
  const [savedNickname, setSavedNickname] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = await getToken()
      const res = await apiClient.get('/api/me/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSavedNickname(res.data.nickname)
      setNickname(res.data.nickname ?? '')
    } catch (err) {
      console.error(err)
    }
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
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  const userId = user.id
  const email = user.emailAddresses[0]?.emailAddress
  const avatarUrl = user.imageUrl
  const displayName = user.fullName ?? user.firstName ?? email

  return (
    <div className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-8">

      {/* Avatar + name */}
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

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Email
        </label>
        <div className="px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground select-none">
          {email}
        </div>
        <p className="text-[11px] text-muted-foreground/60">
          We do not store or share your email address.
        </p>
      </div>

      {/* Nickname */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Nickname
        </label>
        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          maxLength={50}
          placeholder="e.g. data_wizard"
          className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground/60">
          Displayed under your actions on the site. You can change it anytime.
        </p>
        <button
          onClick={handleSave}
          disabled={saving || nickname === savedNickname}
          className="self-start mt-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save'}
        </button>
      </div>

    </div>
  )
}