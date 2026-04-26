import { useState, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { MODULE_REGISTRY } from '../registry'
import apiClient from '../api/client'

interface ModuleState {
  [moduleId: string]: 'active' | 'loading' | 'inactive'
}

const categoryColors: Record<string, string> = {
  generation: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  analytics: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
  testing: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
}

export default function MarketMePage() {
  const { isSignedIn } = useUser()
  const { openSignIn } = useClerk()
  const { t } = useTranslation()
  const [moduleStates, setModuleStates] = useState<ModuleState>({})
  const [loadingModules, setLoadingModules] = useState(true)

  useEffect(() => {
    if (!isSignedIn) {
      setLoadingModules(false)
      return
    }
    fetchActiveModules()
  }, [isSignedIn])

  const fetchActiveModules = async () => {
    try {
      const token = await window.Clerk.session.getToken()
      const response = await apiClient.get('/api/me/modules', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const activeIds: string[] = response.data.modules
      const states: ModuleState = {}
      MODULE_REGISTRY.forEach(m => {
        states[m.id] = activeIds.includes(m.id) ? 'active' : 'inactive'
      })
      setModuleStates(states)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingModules(false)
    }
  }

  const handleActivate = async (moduleId: string) => {
    if (!isSignedIn) {
      openSignIn()
      return
    }
    setModuleStates(prev => ({ ...prev, [moduleId]: 'loading' }))
    try {
      const token = await window.Clerk.session.getToken()
      await apiClient.post(
        '/api/modules/activate',
        { module_id: moduleId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setModuleStates(prev => ({ ...prev, [moduleId]: 'active' }))
    } catch (err) {
      console.error(err)
      setModuleStates(prev => ({ ...prev, [moduleId]: 'inactive' }))
    }
  }

  const handleDeactivate = async (moduleId: string) => {
    setModuleStates(prev => ({ ...prev, [moduleId]: 'loading' }))
    try {
      const token = await window.Clerk.session.getToken()
      await apiClient.delete(`/api/modules/${moduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setModuleStates(prev => ({ ...prev, [moduleId]: 'inactive' }))
    } catch (err) {
      console.error(err)
      setModuleStates(prev => ({ ...prev, [moduleId]: 'active' }))
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-foreground mb-1">{t('marketplace.title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t('marketplace.subtitle')}</p>

      {!isSignedIn && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 mb-6">
          <span className="text-sm text-foreground">
            {t('marketplace.signInBanner')}
          </span>
          <button
            onClick={() => openSignIn()}
            className="ml-4 text-sm font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
          >
            {t('marketplace.signInLink')}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {MODULE_REGISTRY.map((module) => {
          const state = moduleStates[module.id] ?? 'inactive'
          const isActive = state === 'active'
          const isLoading = state === 'loading'

          return (
            <div
              key={module.id}
              className={`flex items-center justify-between px-5 py-4 rounded-xl border transition-colors ${
                isActive
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-background hover:bg-muted/30'
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase tracking-wide ${categoryColors[module.category] ?? 'bg-muted text-muted-foreground'}`}>
                    {module.category}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">{module.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{module.description}</p>
              </div>

              <button
                onClick={() => isActive ? handleDeactivate(module.id) : handleActivate(module.id)}
                disabled={isLoading || loadingModules}
                className={`ml-4 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                  isActive
                    ? 'border border-border bg-background text-muted-foreground hover:text-foreground'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {isLoading ? '...' : isActive
                  ? t('marketplace.remove')
                  : isSignedIn
                    ? t('marketplace.add')
                    : t('marketplace.signInToAdd')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}