import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnalyzeSection } from './AnalyzeSection'
import { ModuleTabs } from '../../shared/ModuleTabs'

const TABS = [
  { id: 'work',  label: 'Work'  },
  { id: 'about', label: 'About' },
  { id: 'stack', label: 'Stack' },
]

export default function AnalyzeMePage() {
  const [activeTab, setActiveTab] = useState('work')
  const { t } = useTranslation('analyze-me')

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto px-6 pt-5">
        <ModuleTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'work' && <AnalyzeSection />}

        {activeTab === 'about' && (
          <div className="max-w-xl">
            <h2 className="text-sm font-medium text-foreground mb-1">{t('title')}</h2>
            <p className="text-xs text-muted-foreground mb-4">{t('version')}</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">{t('description')}</p>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-2">
              {t('whatsnextLabel')}
            </p>
            <div className="flex flex-col gap-1.5 mb-6">
              {(t('whatsnext', { returnObjects: true }) as string[]).map(f => (
                <div key={f} className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">{f}</span>
                  <button className="text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors">
                    + vote
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stack' && (
          <div className="max-w-xl">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-3">
              {t('technologiesLabel')}
            </p>
            <div className="flex flex-col gap-1.5 mb-6">
              {(t('items', { returnObjects: true }) as { name: string; license: string; desc: string }[]).map(item => (
                <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <div>
                    <span className="text-xs text-foreground">{item.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{item.desc}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/50">{item.license}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/stackme-io/StackMe"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('github')}
              </a>
              <span className="text-xs text-muted-foreground/40">{t('badge')}</span>
            </div>
          </div>
        )}
      </main>

      <div className="h-8 border-t border-border/50 flex items-center px-6 gap-5 flex-shrink-0">
        {(t('badges', { returnObjects: true }) as string[]).map(item => (
          <span key={item} className="text-[10px] text-muted-foreground/60">
            <span className="mr-1 text-muted-foreground/40">//</span>{item}
          </span>
        ))}
      </div>
    </div>
  )
}
