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

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-[220px] min-w-[220px] border-r border-border flex flex-col px-3 py-4 gap-1">

        <div className="px-2 py-1 mb-2 text-sm font-medium text-foreground">StackMe</div>

        <Link
          to="/market-me"
          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
            location.pathname === '/market-me'
              ? 'bg-background border border-border font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          {t('nav.marketplace')}
        </Link>

        <div className="my-1 h-px bg-border" />

        {MODULE_REGISTRY.map((module) => (
          <Link
            key={module.id}
            to={module.route}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
              location.pathname === module.route
                ? 'bg-background border border-border font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {module.name}
          </Link>
        ))}

        <div className="mt-auto flex flex-col gap-2">

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full">
                <Globe className="w-4 h-4" />
                {LANGUAGES.find(l => i18n.language.startsWith(l.code))?.label ?? 'EN'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
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
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}
          </button>

          {isSignedIn ? (
            <div className="flex flex-col gap-1">
              <span className="px-2 text-xs text-muted-foreground truncate">
                {user.emailAddresses[0]?.emailAddress}
              </span>
              <SignOutButton>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full">
                  {t('sidebar.signOut')}
                </button>
              </SignOutButton>
            </div>
          ) : (
            <SignInButton mode="modal">
              <button className="w-full px-2 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                {t('sidebar.signIn')}
              </button>
            </SignInButton>
          )}

        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
