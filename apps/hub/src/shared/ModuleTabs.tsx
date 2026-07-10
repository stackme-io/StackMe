import { useSearchParams } from 'react-router-dom'

interface ModuleTab {
  id: string
  label: string
}

interface ModuleTabsProps {
  tabs:         ModuleTab[]
  activeTab:    string
  onChange?:    (id: string) => void
  onShowHint?:  () => void
}

export function ModuleTabs({ tabs, activeTab, onChange, onShowHint }: ModuleTabsProps) {
  const [, setSearchParams] = useSearchParams()

  const handleChange = (id: string) => {
    setSearchParams({ tab: id }, { replace: true })
    onChange?.(id)
  }

  return (
    <div className="flex items-center gap-5 mb-5 overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => handleChange(tab.id)}
          className={`text-sub pb-1.5 transition-colors flex-shrink-0 whitespace-nowrap ${
            activeTab === tab.id
              ? 'text-foreground border-b border-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
      {onShowHint && (
        <button
          onClick={onShowHint}
          className="ml-auto text-meta font-medium text-muted-foreground border border-border/60 rounded-md px-2 py-0.5 hover:text-foreground hover:border-border hover:bg-muted/40 transition-colors"
          aria-label="Show hints"
        >
          ?
        </button>
      )}
    </div>
  )
}
