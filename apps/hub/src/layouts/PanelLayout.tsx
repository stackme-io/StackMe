import { Suspense } from 'react'
import { useWorkspace, type Panel } from '../store/workspace'

export default function PanelLayout() {
  const { panels, activeId } = useWorkspace()
  const activePanel = panels.find((p: Panel) => p.id === activeId)

  if (!activePanel) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Open a service from the menu above
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-auto">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
          Loading...
        </div>
      }>
        <activePanel.manifest.component />
      </Suspense>
    </div>
  )
}