import { create } from 'zustand'
import type { ModuleManifest } from '../types/module-manifest'

export interface Panel {
  id: string
  manifest: ModuleManifest
  pinned: boolean
}

interface WorkspaceStore {
  panels: Panel[]
  openPanel: (manifest: ModuleManifest) => void
  closePanel: (id: string) => void
  togglePin: (id: string) => void
}

export const useWorkspace = create<WorkspaceStore>()(
  (set, get) => ({
    panels: [],

    openPanel: (manifest: ModuleManifest) => {
      const { panels } = get()
      const alreadyOpen = panels.find((p: Panel) => p.manifest.id === manifest.id)
      if (alreadyOpen) return

      const pinnedPanels = panels.filter((p: Panel) => p.pinned)
      const unpinnedPanels = panels.filter((p: Panel) => !p.pinned)

      const newPanel: Panel = { id: manifest.id, manifest, pinned: false }

      if (panels.length === 0 || pinnedPanels.length === 0) {
        set({ panels: [newPanel] })
        return
      }

      if (pinnedPanels.length >= 2) return

      const next = [...pinnedPanels, ...unpinnedPanels.slice(1), newPanel].slice(0, 2)
      set({ panels: next })
    },

    closePanel: (id: string) => {
      set((state: WorkspaceStore) => ({
        panels: state.panels.filter((p: Panel) => p.id !== id),
      }))
    },

    togglePin: (id: string) => {
      set((state: WorkspaceStore) => ({
        panels: state.panels.map((p: Panel) =>
          p.id === id ? { ...p, pinned: !p.pinned } : p
        ),
      }))
    },
  })
)