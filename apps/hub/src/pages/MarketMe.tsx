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

const addButtonColors: Record<string, string> = {
  generation: 'border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-900/40 dark:hover:text-violet-200',
  analytics:  'border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-950/30 dark:text-teal-300 dark:hover:bg-teal-900/40 dark:hover:text-teal-200',
  testing:    'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-900/40 dark:hover:text-amber-200',
}

export default function MarketMePage() {
  const { isSignedIn } = useUser()
  const { openSignIn } = useClerk()
  const { getToken } = useAuth()
  const { t: tc } = useTranslation()
  const { t, i18n } = useTranslation('market-me')
  const { refresh } = useModules()
  const { openPanel, closePanel } = useWorkspace()
  const [moduleStates, setModuleStates] = useState<ModuleState>({})
  const [loadingModules, setLoadingModules] = useState(true)
  const [activeTab, setActiveTab] = useState('modules')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleExpand = (id: string) =>
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })

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

  // QA flagship (LocateMe) gets the rich card; the rest render as compact Beta cards.
  const flagship = MODULE_REGISTRY.find(m => m.id === 'locate-me')
  const betaModules = MODULE_REGISTRY.filter(m => m.id !== 'locate-me')

  return (
    <div className="max-w-5xl px-6 pt-5">

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

          <p className="text-sm text-muted-foreground mb-6">{t('cards.freeLine')}</p>

          <div className="flex flex-col gap-8">

            {/* QA-ready */}
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">{t('cards.groupQA')}</p>
              {flagship && (() => {
                const state = moduleStates[flagship.id] ?? 'inactive'
                const isActive = state === 'active'
                const isLoading = state === 'loading'
                return (
                  <div className="flex flex-col rounded-xl border border-border bg-background p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-baseline gap-2.5 flex-wrap">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">{t('cards.tagQA')}</span>
                        <h3 className="text-lg font-semibold text-foreground">{flagship.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleOpen(flagship.id)}
                          className="px-4 py-1.5 rounded-lg text-xs font-medium border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-300 transition-colors whitespace-nowrap"
                        >
                          {tc('marketplace.open')}
                        </button>
                        <button
                          onClick={() => isActive ? handleDeactivate(flagship.id) : handleActivate(flagship.id)}
                          disabled={isLoading || loadingModules}
                          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                            isActive
                              ? 'border border-border bg-background text-muted-foreground hover:text-foreground'
                              : addButtonColors[flagship.category] ?? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          }`}
                        >
                          {isLoading ? '...' : isActive ? tc('marketplace.remove') : isSignedIn ? tc('marketplace.add') : tc('marketplace.signInToAdd')}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 mb-5">{t('cards.locateSubtitle')}</p>

                    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
                      {([
                        ['cards.locateNeedLabel', 'cards.locateNeed'],
                        ['cards.locateGetLabel', 'cards.locateGet'],
                        ['cards.locateNotLabel', 'cards.locateNot'],
                        ['cards.locateHonestLabel', 'cards.locateHonest'],
                      ] as const).map(([lk, bk]) => (
                        <div key={lk}>
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">{t(lk)}</div>
                          <p className="text-sm leading-relaxed text-muted-foreground max-w-[62ch]">{t(bk)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* In beta */}
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">{t('cards.groupBeta')}</p>
              <div className="grid sm:grid-cols-2 gap-4 items-start">
                {betaModules.map((module) => {
                  const ck = module.id === 'forge-me' ? 'forge' : 'analyze'
                  const sub = t(`cards.${ck}Subtitle`)
                  const desc = t(`cards.${ck}Desc`)
                  const isExpanded = expanded.has(module.id)
                  const has = (k: string) => i18n.exists(`market-me:cards.${ck}${k}`)
                  const canExpand = has('Need') || has('Get') || has('Features')
                  return (
                    <div key={module.id} className="flex flex-col rounded-xl border border-border bg-background p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide border border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-700/50 dark:bg-violet-900/40 dark:text-violet-300">{t('cards.tagBeta')}</span>
                        <h3 className="text-base font-semibold text-foreground">{module.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1.5">{sub}</p>
                      <p className="text-[13px] leading-relaxed text-muted-foreground/90">{desc}</p>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border/60 flex flex-col gap-3">
                          {has('Need') && (
                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{t('cards.locateNeedLabel')}</div>
                              <p className="text-sm leading-relaxed text-muted-foreground max-w-[62ch]">{t(`cards.${ck}Need`)}</p>
                            </div>
                          )}
                          {has('Get') && (
                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{t('cards.locateGetLabel')}</div>
                              <p className="text-sm leading-relaxed text-muted-foreground max-w-[62ch]">{t(`cards.${ck}Get`)}</p>
                            </div>
                          )}
                          {has('Features') && (
                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{t('cards.featuresLabel')}</div>
                              <ul className="list-disc pl-5 text-sm leading-relaxed text-muted-foreground flex flex-col gap-1">
                                {(t(`cards.${ck}Features`, { returnObjects: true }) as string[]).map((f, i) => <li key={i}>{f}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => handleOpen(module.id)}
                          className="px-4 py-1.5 rounded-lg text-xs font-medium border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-300 transition-colors whitespace-nowrap"
                        >
                          {tc('marketplace.open')}
                        </button>
                        {canExpand && (
                          <button
                            onClick={() => toggleExpand(module.id)}
                            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium border border-border bg-background text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                          >
                            {isExpanded ? t('cards.less') : t('cards.more')}
                            <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'} text-sm`} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

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