import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Lock, LockOpen, X, Sun, Moon, Globe } from 'lucide-react'
import { SignInButton, SignOutButton, useUser } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MODULE_REGISTRY } from '../registry'
import { useTheme } from '../hooks/useTheme'
import { useModules } from '../context/ModulesContext'
import { useWorkspace, type Panel } from '../store/workspace'
import { lazy } from 'react'
const MarketMePage = lazy(() => import('../pages/MarketMe'))

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'uk', label: 'UK', name: 'Українська' },
]

const DEFAULT_MODULE_IDS = ['forge-me', 'analyze-me']

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

export default function AppShell() {
  const location = useLocation()
  const { isSignedIn, user } = useUser()
  const { t, i18n } = useTranslation()
  const { theme, toggle } = useTheme()
  const { activeModuleIds } = useModules()
  const navigate = useNavigate()
  const { openPanel, panels, activeId, closePanel, togglePin, setActive } = useWorkspace()

  useEffect(() => {
    if (panels.length === 0) {
      openPanel(MARKET_ME_MANIFEST)
    }
  }, [])

  useEffect(() => {
    const active = panels.find(p => p.id === activeId)
    if (active) navigate(active.manifest.route)
  }, [activeId])

  const visibleModules = isSignedIn
    ? MODULE_REGISTRY.filter(m => activeModuleIds.includes(m.id))
    : MODULE_REGISTRY.filter(m => DEFAULT_MODULE_IDS.includes(m.id))

  const isAccountMe = location.pathname === '/account-me'

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">

      <header className="flex items-center justify-between px-4 h-11 border-b border-border flex-shrink-0">

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">StackMe</span>


          {isAccountMe && (
            <>
              <span className="text-border">|</span>
              <span className="text-xs font-medium text-foreground">AccountMe</span>
            </>
          )}

          {panels.length > 0 && (
            <>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1">
                {panels.map((panel: Panel) => {
                  const isActive = panel.id === activeId
                  return (
                    <div
                      key={panel.id}
                      onClick={() => setActive(panel.id)}
                      className={[
                        'flex items-center gap-1.5 h-7 pl-2.5 pr-1 text-xs cursor-pointer transition-all select-none',
                        isActive
                          ? 'text-foreground font-medium rounded-md border border-border border-l-2 border-l-primary'
                          : 'text-muted-foreground hover:text-foreground border-l-2 border-l-transparent',
                      ].join(' ')}
                    >
                      <span>{panel.manifest.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePin(panel.id) }}
                        className={[
                          'flex items-center justify-center w-4 h-4 rounded transition-colors hover:bg-muted',
                          panel.pinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                        ].join(' ')}
                        title={panel.pinned ? 'Unlock' : 'Lock'}
                      >
                        {panel.pinned
                          ? <Lock className="w-3 h-3" />
                          : <LockOpen className="w-3 h-3" />
                        }
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); closePanel(panel.id) }}
                        className="flex items-center justify-center w-4 h-4 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Close"
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
                  className={i18n.language.startsWith(lang.code) ? 'font-medium text-foreground' : ''}
                >
                  {lang.label} — {lang.name}
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
                <DropdownMenuItem asChild>
                  <Link to="/market-me" className="cursor-pointer">
                    {t('nav.marketplace')}
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
                Services
              </div>
              {visibleModules.map(module => {
                const isOpen = panels.some((p: Panel) => p.id === module.id)
                return (
                  <DropdownMenuItem
                    key={module.id}
                    className={`cursor-pointer ${isOpen ? 'font-medium text-foreground' : ''}`}
                    onClick={() => openPanel(module)}
                  >
                    {module.name}
                  </DropdownMenuItem>
                )
              })}
              <div className="border-t border-border mt-1 pt-1">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => openPanel(MARKET_ME_MANIFEST)}
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