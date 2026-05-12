import { Suspense } from 'react'
import { Pin, PinOff, X } from 'lucide-react'
import { useWorkspace, type Panel } from '../store/workspace'

export default function PanelLayout() {
  const { panels, closePanel, togglePin } = useWorkspace()

  if (panels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Open a service from the menu above
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {panels.map((panel: Panel, index: number) => (
        <div
          key={panel.id}
          className={`flex flex-col h-full overflow-hidden flex-1 ${
            index > 0 ? 'border-l border-border' : ''
          }`}
        >
          <div className="flex items-center justify-between px-3 h-9 border-b border-border flex-shrink-0 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs font-medium text-foreground">
                {panel.manifest.name}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => togglePin(panel.id)}
                className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
                  panel.pinned
                    ? 'text-primary hover:text-primary/70'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={panel.pinned ? 'Unpin' : 'Pin'}
              >
                {panel.pinned
                  ? <Pin className="w-3 h-3" />
                  : <PinOff className="w-3 h-3" />
                }
              </button>
              <button
                onClick={() => closePanel(panel.id)}
                className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Close"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Loading...
              </div>
            }>
              <panel.manifest.component />
            </Suspense>
          </div>
        </div>
      ))}
    </div>
  )
}