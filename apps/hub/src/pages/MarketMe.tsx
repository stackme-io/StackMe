import { useState, useEffect } from 'react'
import { useUser, useClerk, useAuth } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { MODULE_REGISTRY } from '../registry'
import apiClient from '../api/client'
import { useModules } from '../context/ModulesContext'
import { useWorkspace } from '../store/workspace'
import { ModuleTabs } from '../shared/ModuleTabs'

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
  const { getToken } = useAuth()
  const { t: tc } = useTranslation()
  const { t } = useTranslation('market-me')
  const { refresh } = useModules()
  const { openPanel, closePanel } = useWorkspace()
  const [moduleStates, setModuleStates] = useState<ModuleState>({})
  const [loadingModules, setLoadingModules] = useState(true)
  const [activeTab, setActiveTab] = useState('modules')

  useEffect(() => {
    if (!isSignedIn) {
      setLoadingModules(false)
      return
    }
    fetchActiveModules()
  }, [isSignedIn])

  const fetchActiveModules = async () => {
    try {
      const token = await getToken()
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
      const token = await getToken()
      await apiClient.post(
        '/api/modules/activate',
        { module_id: moduleId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setModuleStates(prev => ({ ...prev, [moduleId]: 'active' }))
      await refresh()
    } catch (err) {
      console.error(err)
      setModuleStates(prev => ({ ...prev, [moduleId]: 'inactive' }))
    }
  }

  const handleDeactivate = async (moduleId: string) => {
    setModuleStates(prev => ({ ...prev, [moduleId]: 'loading' }))
    try {
      const token = await getToken()
      await apiClient.delete(`/api/modules/${moduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setModuleStates(prev => ({ ...prev, [moduleId]: 'inactive' }))
      closePanel(moduleId)
      await refresh()
    } catch (err) {
      console.error(err)
      setModuleStates(prev => ({ ...prev, [moduleId]: 'active' }))
    }
  }

  const handleOpen = (moduleId: string) => {
    const manifest = MODULE_REGISTRY.find(m => m.id === moduleId)
    if (manifest) openPanel(manifest)
  }

  return (
    <div className="max-w-3xl px-6 pt-5">

      <ModuleTabs
        tabs={[
          { id: 'modules', label: tc('marketplace.modules') },
          { id: 'manifest', label: tc('marketplace.manifest') },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'modules' && (
        <>
          {!isSignedIn && (
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 mb-6">
              <span className="text-sm text-foreground">
                {tc('marketplace.signInBanner')}
              </span>
              <button
                onClick={() => openSignIn()}
                className="ml-4 text-sm font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
              >
                {tc('marketplace.signInLink')}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {MODULE_REGISTRY.map((module) => {
              const state = moduleStates[module.id] ?? 'inactive'
              const isActive = state === 'active'
              const isLoading = state === 'loading'

              return (
                <div
                  key={module.id}
                  className={`flex flex-col rounded-xl border transition-colors p-5 ${
                    isActive
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border bg-background hover:bg-muted/30'
                  }`}
                >
                  {/* Top */}
                  <div className="flex flex-col gap-2 flex-1">
                    <span className={`self-start text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide ${categoryColors[module.category] ?? 'bg-muted text-muted-foreground'}`}>
                      {tc(`categories.${module.category}`, module.category)}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">{module.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tc(`modules.${module.id}.description`, module.description)}</p>
                  </div>

                  {/* Bottom */}
                  <div className="flex items-center gap-2 mt-5">
                    <button
                      onClick={() => handleOpen(module.id)}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium border border-border bg-background text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                    >
                      {tc('marketplace.open')}
                    </button>
                    <button
                      onClick={() => isActive ? handleDeactivate(module.id) : handleActivate(module.id)}
                      disabled={isLoading || loadingModules}
                      className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                        isActive
                          ? 'border border-border bg-background text-muted-foreground hover:text-foreground'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {isLoading ? '...' : isActive
                        ? tc('marketplace.remove')
                        : isSignedIn
                          ? tc('marketplace.add')
                          : tc('marketplace.signInToAdd')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'manifest' && (
        <div className="max-w-xl">
          <h2 className="text-xl font-medium text-foreground leading-snug mb-3 whitespace-pre-line">
            {t('heroTitle')}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground mb-2">
            {t('heroLead')}
          </p>
          <p className="text-sm leading-relaxed text-foreground font-medium mb-8">
            {t('heroStatement')}
          </p>

          {([1, 2, 3, 4, 5, 6] as const).map(n => (
            <div key={n} className="py-5 border-t border-border/50 last:border-b">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center flex-shrink-0">
                  <i className={`ti ${t(`block${n}Icon`)} text-sm text-muted-foreground`} />
                </div>
                <p className="text-xs font-medium text-foreground">
                  {t(`block${n}Title`)}
                  {(n === 2 || n === 3) && (
                    <span className="ml-2 text-[10px] font-normal px-1.5 py-0.5 rounded border border-border text-muted-foreground/95">
                      {t(`block${n}Tag`)}
                    </span>
                  )}
                </p>
              </div>
              <div className="pl-[38px] flex flex-col gap-2">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t(`block${n}p1`)}
                  {n === 2 && (
                    <span className="text-foreground font-medium"> {t('block2accent1')}</span>
                  )}
                </p>
                {t(`block${n}p2`) && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {(n === 3 || n === 5) && (
                      <span className="text-foreground font-medium">{t(`block${n}accent`)} </span>
                    )}
                    {t(`block${n}p2rest`)}
                  </p>
                )}
                {(n === 4 || n === 6) && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t(`block${n}p2`)}
                    <span className="text-foreground font-medium"> {t(`block${n}accent`)}</span>
                    {n === 4 && <span className="text-muted-foreground"> {t('block4p2rest')}</span>}
                  </p>
                )}
              </div>
            </div>
          ))}

          <div className="flex gap-2.5 mt-6 mb-8 flex-wrap">
            <a href="https://github.com/stackme-io/StackMe" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-3.5 py-1.5 hover:bg-muted/40 hover:text-foreground transition-colors">
              <i className="ti ti-brand-github text-sm" />
              {t('linkGithub')}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}