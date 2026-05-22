import { useTranslation } from 'react-i18next'

type RoadmapItem = { title: string; desc: string }
type DoneGroup   = { group: string; items: RoadmapItem[] }

function SectionDivider({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={`h-px flex-1 ${accent ? 'bg-primary/30' : 'bg-border'}`} />
      <p className={`text-[9px] uppercase tracking-widest font-medium ${accent ? 'text-foreground' : 'text-muted-foreground/50'}`}>
        {label}
      </p>
      <div className={`h-px flex-1 ${accent ? 'bg-primary/30' : 'bg-border'}`} />
    </div>
  )
}

function RoadmapRow({ prefix, title, desc, action }: {
  prefix: string
  title: string
  desc: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-baseline gap-2 py-1 border-b border-border/20 last:border-0">
      <span className="text-muted-foreground/40 text-xs flex-shrink-0 w-3">{prefix}</span>
      <span className="text-xs text-foreground w-36 flex-shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">{title}</span>
      <span className="text-xs text-muted-foreground/75 flex-1">{desc}</span>
      {action}
    </div>
  )
}

export function RoadmapTab() {
  const { t } = useTranslation('forge-me')

  return (
    <div className="max-w-xl pb-8">

      <div className="mb-6">
        <SectionDivider label={t('doneLabel')} accent />
        {(t('done', { returnObjects: true }) as DoneGroup[]).map((group, gi) => (
          <div key={group.group} className="mb-2">
            {gi > 0 && <div className="mt-4" />}
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-1">
              {group.group}
            </p>
            {group.items.map(item => (
              <RoadmapRow key={item.title} prefix="✓" title={item.title} desc={item.desc} />
            ))}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <SectionDivider label={t('nextLabel')} accent />
        <p className="text-[10px] text-muted-foreground/50 mb-3 leading-relaxed">
          {t('nextDesc')}
        </p>
        {(t('next', { returnObjects: true }) as RoadmapItem[]).map(item => (
          <RoadmapRow
            key={item.title}
            prefix="→"
            title={item.title}
            desc={item.desc}
            action={
              <button className="text-[10px] text-muted-foreground/40 hover:text-foreground transition-colors flex-shrink-0">
                + vote
              </button>
            }
          />
        ))}
      </div>

      <div className="mb-6">
        <SectionDivider label={t('laterLabel')} />
        {(t('later', { returnObjects: true }) as RoadmapItem[]).map(item => (
          <RoadmapRow key={item.title} prefix="·" title={item.title} desc={item.desc} />
        ))}
      </div>

      <div>
        <SectionDivider label={t('suggestLabel')} />
        <textarea
          maxLength={300}
          placeholder={t('suggestPlaceholder')}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          rows={3}
        />
        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-2 text-[10px] text-muted-foreground/50 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded" />
            {t('suggestUsernameLabel')}
          </label>
          <p className="text-[10px] text-muted-foreground/40">{t('suggestHint')}</p>
        </div>
        <button className="mt-3 px-4 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
          {t('suggestSubmit')}
        </button>
      </div>

    </div>
  )
}