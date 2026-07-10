import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Bell } from 'lucide-react'
import apiClient from '../api/client'

type NotifType = 'suggestion_published' | 'new_version' | 'survey' | 'announcement'

interface Notification {
  id: number
  type: NotifType
  title: string
  body: string | null
  created_at: string
  read: boolean
  broadcast: boolean
}

function timeAgo(iso: string, t: TFunction, lang: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return t('notify.timeJustNow')
  if (diff < 3600)  return t('notify.timeMinutes', { count: Math.floor(diff / 60) })
  if (diff < 86400) return t('notify.timeHours',   { count: Math.floor(diff / 3600) })
  if (diff < 604800) return t('notify.timeDays',   { count: Math.floor(diff / 86400) })
  return new Date(iso).toLocaleDateString(lang)
}

const TYPE_ICON: Record<NotifType, string> = {
  suggestion_published: '💬',
  new_version: '📢',
  survey: '📊',
  announcement: '📣',
}

export default function NotifyMePage() {
  const { t, i18n } = useTranslation()
  const { getToken } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    try {
      const token = await getToken()
      const res = await apiClient.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications(res.data)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNotifications() }, [])

  const markRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    try {
      const token = await getToken()
      await apiClient.post(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {}
  }

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    try {
      const token = await getToken()
      await apiClient.post('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {}
  }

  const visible = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h1 className="text-sm font-medium text-foreground">{t('notify.title')}</h1>
          {unreadCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            {t('notify.markAllRead')}
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-4">
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-xs border transition-colors ${
              filter === f
                ? 'border-primary/50 bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:bg-muted/30'
            }`}
          >
            {f === 'all' ? t('notify.all') : t('notify.unread')}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-xs text-muted-foreground/95 py-8 text-center">{t('common.loading')}</p>
      ) : visible.length === 0 ? (
        <p className="text-xs text-muted-foreground/95 py-8 text-center">
          {filter === 'unread' ? t('notify.emptyUnread') : t('notify.emptyAll')}
        </p>
      ) : (
        <div className="flex flex-col border border-border rounded-xl overflow-hidden">
          {visible.map((n, i) => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/20 ${
                i > 0 ? 'border-t border-border/50' : ''
              } ${!n.read ? 'bg-primary/5' : ''}`}
            >
              {/* Unread dot */}
              <div className="flex-shrink-0 mt-1 w-2 flex justify-center">
                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary block" />}
              </div>

              {/* Icon */}
              <span className="text-sm flex-shrink-0 mt-0.5">
                {TYPE_ICON[n.type] ?? '🔔'}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs ${n.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-[11px] text-muted-foreground/95 mt-0.5 leading-relaxed">
                    {n.body}
                  </p>
                )}
              </div>

              {/* Time */}
              <span className="text-[10px] text-muted-foreground/80 flex-shrink-0 mt-0.5">
                {timeAgo(n.created_at, t, i18n.language)}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
