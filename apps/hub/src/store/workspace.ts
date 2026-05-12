import { create } from 'zustand'
import type { ModuleManifest } from '../types/module-manifest'

export interface Panel {
  id: string
  manifest: ModuleManifest
  pinned: boolean
}

interface WorkspaceStore {
  panels: Panel[]
  activeId: string | null
  openPanel: (manifest: ModuleManifest) => void
  closePanel: (id: string) => void
  togglePin: (id: string) => void
  setActive: (id: string) => void
}

export const useWorkspace = create<WorkspaceStore>()(
  (set, get) => ({
    panels: [],
    activeId: null,

    openPanel: (manifest: ModuleManifest) => {
      const { panels } = get()
      const alreadyOpen = panels.find((p: Panel) => p.manifest.id === manifest.id)

      if (alreadyOpen) {
        set({ activeId: manifest.id })
        return
      }

      const pinnedPanels = panels.filter((p: Panel) => p.pinned)
      const newPanel: Panel = { id: manifest.id, manifest, pinned: false }

      const next = [...pinnedPanels, newPanel]
      set({ panels: next, activeId: manifest.id })
    },

    closePanel: (id: string) => {
      const { panels, activeId } = get()
      const next = panels.filter((p: Panel) => p.id !== id)
      const nextActiveId = id === activeId
        ? (next[next.length - 1]?.id ?? null)
        : activeId
      set({ panels: next, activeId: nextActiveId })
    },

    togglePin: (id: string) => {
      set((state: WorkspaceStore) => ({
        panels: state.panels.map((p: Panel) =>
          p.id === id ? { ...p, pinned: !p.pinned } : p
        ),
      }))
    },

    setActive: (id: string) => {
      set({ activeId: id })
    },
  })
)