interface ModuleTab {
  id: string
  label: string
}

interface ModuleTabsProps {
  tabs: ModuleTab[]
  activeTab: string
  onChange: (id: string) => void
}

export function ModuleTabs({ tabs, activeTab, onChange }: ModuleTabsProps) {
  return (
    <div className="flex items-center gap-5 mb-5">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
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