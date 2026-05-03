import { Link, Outlet, useLocation } from 'react-router-dom'
import { SignInButton, SignOutButton, useUser } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { Sun, Moon, Globe } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MODULE_REGISTRY } from '../registry'
import { useTheme } from '../hooks/useTheme'

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'uk', label: 'UK', name: 'Українська' },
]

export default function AppShell() {
  const location = useLocation()
  const { isSignedIn, user } = useUser()
  const { t, i18n } = useTranslation()
  const { theme, toggle } = useTheme()

  const activeModule = MODULE_REGISTRY.find(m => location.pathname === m.route)

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">

      {/* ── Topbar ── */}
      <header className="flex items-center justify-between px-4 h-11 border-b border-border flex-shrink-0">

        {/* Left — logo + active module pill */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">StackMe</span>
          {activeModule && (
            <>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs font-medium text-primary">{activeModule.name}</span>
              </div>
            </>
          )}
          {!activeModule && location.pathname === '/market-me' && (
            <>
              <span className="text-border">|</span>
              <span className="text-xs font-medium text-foreground">MarketMe</span>
            </>
          )}
        </div>

        {/* Right — controls */}
        <div className="flex items-center gap-1">

          {/* Language */}
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

          {/* Theme */}
          <button
            onClick={toggle}
            className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Auth */}
          {isSignedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                  {user.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() ?? 'U'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end">
                <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border mb-1">
                  {user.emailAddresses[0]?.emailAddress}
                </div>
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

          {/* Service switcher — 9 dots */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="5"  cy="5"  r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="12" cy="5"  r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="19" cy="5"  r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="5"  cy="12" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="5"  cy="19" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="19" cy="19" r="1.5" fill="currentColor" stroke="none"/>
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" className="w-48">
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border mb-1">
                Services
              </div>
              {MODULE_REGISTRY.map(module => (
                <DropdownMenuItem key={module.id} asChild>
                  <Link
                    to={module.route}
                    className={`cursor-pointer ${location.pathname === module.route ? 'font-medium text-foreground' : ''}`}
                  >
                    {module.name}
                  </Link>
                </DropdownMenuItem>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <DropdownMenuItem asChild>
                  <Link to="/market-me" className="cursor-pointer">
                    + {t('nav.marketplace')}
                  </Link>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

    </div>
  )
}