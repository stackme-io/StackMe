import { useTranslation } from 'react-i18next'

export function StackTab() {
  const { t } = useTranslation('forge-me')

  return (
    <div className="max-w-xl">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-3">
        {t('technologiesLabel')}
      </p>
      <div className="flex flex-col mb-6">
        {(t('items', { returnObjects: true }) as { name: string; license: string; desc: string }[]).map(item => (
          <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-border/50">
            <div>
              <span className="text-xs text-foreground">{item.name}</span>
              <span className="text-xs text-muted-foreground/75 ml-2">{item.desc}</span>
            </div>
            <span className="text-[10px] text-muted-foreground/50">{item.license}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <a href="https://github.com/stackme-io/StackMe" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          {t('github')}
        </a>
        <span className="text-xs text-muted-foreground/40">{t('badge')}</span>
      </div>
    </div>
  )
}