import { useEffect, useState, useRef, lazy } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Lock, LockOpen, X, Sun, Moon, Globe, Bell } from 'lucide-react'
import { SignInButton, SignOutButton, useUser, useAuth } from '@clerk/clerk-react'
import apiClient from '../api/client'
import { useTranslation } from 'react-i18next'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MODULE_REGISTRY } from '../registry'
import LogoMark from '../components/LogoMark'
import ShareButton from '../shared/ShareButton'
import { useTheme } from '../hooks/useTheme'
import { useModules } from '../context/ModulesContext'
import { useWorkspace, type Panel } from '../store/workspace'

const MarketMePage = lazy(() => import('../pages/MarketMe'))

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'uk', label: 'UK', name: 'Українська' },
]

const DEFAULT_MODULE_IDS = ['forge-me', 'analyze-me', 'locate-me']

const MARKET_ME_MANIFEST = {
  id: 'market-me',
  name: 'MarketMe',
  description: '',
  icon: 'Store',
  route: '/market-me',
  category: 'analytics' as const,
  defaultForNewUsers: false,
  component: MarketMePage,
}

const MODULE_LOGO_COLORS: Record<string, string> = {
  'forge-me':   '#a78bfa',
  'analyze-me': '#2dd4bf',
  'locate-me':  '#22d3ee',
}

const MODULE_COLORS: Record<string, string> = {
  'forge-me': 'border-l-violet-400',
  'analyze-me': 'border-l-teal-400',
  'locate-me': 'border-l-cyan-400',
}

const MODULE_TEXT_COLORS: Record<string, string> = {
  'forge-me': 'text-violet-400',
  'analyze-me': 'text-teal-400',
  'locate-me': 'text-cyan-400',
}

export default function AppShell() {
  const location = useLocation()
  const { isSignedIn, user } = useUser()
  const { getToken } = useAuth()
  const { t, i18n } = useTranslation()
  const [unread, setUnread] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { theme, toggle } = useTheme()
  const { activeModuleIds } = useModules()
  const navigate = useNavigate()
  const { openPanel, panels, activeId, closePanel, togglePin, setActive } = useWorkspace()

  useEffect(() => {
    if (panels.length === 0) {
      // On direct URL navigation (e.g. /analyze-me shared link) open the matching panel,
      // not always market-me.
      const systemPaths = ['/account-me', '/notify-me', '/']
      if (!systemPaths.includes(location.pathname)) {
        const allManifests = [...MODULE_REGISTRY, MARKET_ME_MANIFEST]
        const matched = allManifests.find(m => m.route === location.pathname)
        if (matched) {
          openPanel(matched)
          return
        }
      }
      openPanel(MARKET_ME_MANIFEST)
    }
  }, [])

  const fetchUnread = async () => {
    if (!isSignedIn) { setUnread(0); return }
    try {
      const token = await getToken()
      const res = await apiClient.get('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUnread(res.data.unread ?? 0)
    } catch {}
  }

  useEffect(() => {
    fetchUnread()
    intervalRef.current = setInterval(fetchUnread, 60_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isSignedIn])

  useEffect(() => {
    const systemPaths = ['/account-me', '/notify-me']
    if (systemPaths.includes(location.pathname)) return
    const active = panels.find((p: Panel) => p.id === activeId)
    if (active && location.pathname !== active.manifest.route) {
      navigate(active.manifest.route)
    }
  }, [activeId])

  useEffect(() => {
    const matchedPanel = panels.find((p: Panel) => p.manifest.route === location.pathname)
    if (matchedPanel && matchedPanel.id !== activeId) {
      setActive(matchedPanel.id)
    }
  }, [location.pathname])

  const visibleModules = isSignedIn
    ? MODULE_REGISTRY.filter(m => activeModuleIds.includes(m.id))
    : MODULE_REGISTRY.filter(m => DEFAULT_MODULE_IDS.includes(m.id))

  const isAccountMe = location.pathname === '/account-me'
  const isNotifyMe  = location.pathname === '/notify-me'
  const isSystemPage = isAccountMe || isNotifyMe

  const logoColor = isSystemPage || !activeId
    ? '#ffffff'
    : (MODULE_LOGO_COLORS[activeId] ?? '#ffffff')

  useEffect(() => {
    // html lang attribute
    document.documentElement.lang = i18n.language

    // Page title (translated)
    const systemTitles: Record<string, string> = {
      '/account-me': t('seo.titleAccountMe'),
      '/notify-me':  t('seo.titleNotifyMe'),
    }
    const moduleTitles: Record<string, string> = {
      'forge-me':   t('seo.titleForgeMe'),
      'analyze-me': t('seo.titleAnalyzeMe'),
      'market-me':  t('seo.titleMarketMe'),
    }
    document.title = isSystemPage
      ? (systemTitles[location.pathname] ?? t('seo.titleDefault'))
      : (moduleTitles[activeId ?? ''] ?? t('seo.titleDefault'))

    // Meta description & og tags (helps Google; social scrapers see index.html)
    const desc = isSystemPage ? t('seo.titleDefault') : t('seo.description')
    const updateMeta = (selector: string, attr: string, value: string) => {
      const el = document.querySelector<HTMLMetaElement>(selector)
      if (el) el.setAttribute(attr, value)
    }
    const canonicalUrl = `https://stackme-app.vercel.app${location.pathname === '/' ? '' : location.pathname}`
    updateMeta('meta[name="description"]',         'content', desc)
    updateMeta('meta[property="og:description"]',  'content', desc)
    updateMeta('meta[property="og:title"]',        'content', document.title)
    updateMeta('meta[property="og:url"]',          'content', canonicalUrl)
    updateMeta('meta[name="twitter:description"]', 'content', desc)
    updateMeta('meta[name="twitter:title"]',       'content', document.title)
    updateMeta('meta[name="twitter:image"]',       'content', 'https://stackme-app.vercel.app/og-image.png')

    // noindex on private pages
    let metaRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!metaRobots) {
      metaRobots = document.createElement('meta')
      metaRobots.name = 'robots'
      document.head.appendChild(metaRobots)
    }
    metaRobots.content = isSystemPage ? 'noindex, nofollow' : 'index, follow'
  }, [location.pathname, activeId, isSystemPage, i18n.language])

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">

      <header className="flex items-center justify-between px-4 h-11 border-b border-border flex-shrink-0">

        <div className="flex items-center gap-3">
          <Link to="/market-me" className="flex items-center gap-3" onClick={() => openPanel(MARKET_ME_MANIFEST)}>
            <LogoMark color={logoColor} height={22} />
            <span className="text-sm font-medium text-muted-foreground">StackMe</span>
          </Link>

          {isAccountMe && (
            <>
              <span className="text-border">|</span>
              <span className="text-xs font-medium text-foreground">{t('nav.accountMe')}</span>
            </>
          )}
          {isNotifyMe && (
            <>
              <span className="text-border">|</span>
              <span className="text-xs font-medium text-foreground">{t('nav.notifications')}</span>
            </>
          )}

          {panels.length > 0 && (
            <>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1">
                {panels.map((panel: Panel) => {
                  const isActive = panel.id === activeId && !isSystemPage
                  return (
                    <div
                      key={panel.id}
                      onClick={() => { setActive(panel.id); navigate(panel.manifest.route) }}
                      className={[
                        'flex items-center gap-1.5 h-7 pl-2.5 pr-1 text-xs cursor-pointer transition-all select-none',
                        isActive
                          ? `text-foreground font-medium rounded-md border border-border border-l-2 ${MODULE_COLORS[panel.id] ?? 'border-l-primary'}`
                          : 'text-muted-foreground hover:text-foreground border-l-2 border-l-transparent',
                      ].join(' ')}
                    >
                      <span className={isActive ? (MODULE_TEXT_COLORS[panel.id] ?? '') : ''}>
                        {panel.manifest.name}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePin(panel.id) }}
                        className={[
                          'flex items-center justify-center w-4 h-4 rounded transition-colors hover:bg-muted',
                          panel.pinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                        ].join(' ')}
                        title={panel.pinned ? t('nav.unlock') : t('nav.lock')}
                      >
                        {panel.pinned
                          ? <Lock className="w-3 h-3" />
                          : <LockOpen className="w-3 h-3" />
                        }
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); closePanel(panel.id) }}
                        className="flex items-center justify-center w-4 h-4 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={t('nav.close')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">

          {!isSystemPage && (
            <ShareButton note={activeId === 'locate-me' ? t('share.noteLocal') : t('share.note')} />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Globe className="w-3.5 h-3.5" />
                {LANGUAGES.find(l => i18n.language.startsWith(l.code))?.label ?? 'EN'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end">
              {LANGUAGES.map(lang => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={`whitespace-nowrap ${i18n.language.startsWith(lang.code) ? 'font-medium text-foreground' : ''}`}
                >
                  {lang.label} - {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={toggle}
            className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {isSignedIn && (
            <Link
              to="/notify-me"
              className="relative flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
              )}
            </Link>
          )}

          {isSignedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-7 h-7 rounded-full overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                  {user.imageUrl
                    ? <img src={user.imageUrl} alt="avatar" className="w-full h-full object-cover" />
                    : user.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() ?? 'U'
                  }
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end">
                <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border mb-1">
                  {user.emailAddresses[0]?.emailAddress}
                </div>
                <DropdownMenuItem asChild>
                  <Link to="/account-me" className="cursor-pointer">
                    My Account
                  </Link>
                </DropdownMenuItem>
                <SignOutButton>
                  <DropdownMenuItem className="cursor-pointer text-destructive">
                    {t('sidebar.signOut')}
                  </DropdownMenuItem>
                </SignOutButton>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <SignInButton mode="modal">
              <button className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                {t('sidebar.signIn')}
              </button>
            </SignInButton>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="5"  cy="5"  r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="5"  r="1.5" fill="currentColor"/>
                  <circle cx="19" cy="5"  r="1.5" fill="currentColor"/>
                  <circle cx="5"  cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="19" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="5"  cy="19" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                  <circle cx="19" cy="19" r="1.5" fill="currentColor"/>
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" className="w-48">
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border mb-1">
                {t('nav.services')}
              </div>
              {visibleModules.map(module => {
                const isOpen = panels.some((p: Panel) => p.id === module.id)
                return (
                  <DropdownMenuItem
                    key={module.id}
                    className={`cursor-pointer ${isOpen ? 'font-medium text-foreground' : ''}`}
                    onClick={() => { openPanel(module); navigate(module.route) }}
                  >
                    {module.name}
                  </DropdownMenuItem>
                )
              })}
              <div className="border-t border-border mt-1 pt-1">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => { openPanel(MARKET_ME_MANIFEST); navigate(MARKET_ME_MANIFEST.route) }}
                >
                  + {t('nav.marketplace')}
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

    </div>
  )
}