import { Suspense } from 'react'
import { useWorkspace, type Panel } from '../store/workspace'

export default function PanelLayout() {
  const { panels, activeId } = useWorkspace()

  if (panels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Open a service from the menu above
      </div>
    )
  }

  return (
    <>
      {panels.map((panel: Panel) => (
        <div
          key={panel.id}
          className="h-full w-full overflow-auto"
          style={{ display: panel.id === activeId ? 'block' : 'none' }}
        >
          <Suspense fallback={
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Loading...
            </div>
          }>
            <panel.manifest.component />
          </Suspense>
        </div>
      ))}
    </>
  )
}