import { track } from '@vercel/analytics'

interface ModuleTab {
  id: string
  label: string
}

interface ModuleTabsProps {
  tabs: ModuleTab[]
  activeTab: string
  onChange: (id: string) => void
  moduleId?: string
}

export function ModuleTabs({ tabs, activeTab, onChange, moduleId }: ModuleTabsProps) {
  const handleChange = (id: string) => {
    track('module_tab_view', {
      tab: id,
      ...(moduleId ? { module: moduleId } : {}),
    })
    onChange(id)
  }

  return (
    <div className="flex items-center gap-5 mb-5">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => handleChange(tab.id)}
          className={`text-xs pb-1.5 transition-colors ${
            activeTab === tab.id
              ? 'text-foreground border-b border-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
