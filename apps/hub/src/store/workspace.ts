import { create } from 'zustand'
import { ModuleManifest } from '../registry'

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

export const useWorkspace = create<WorkspaceStore>((set, get) => ({
  panels: [],

  openPanel: (manifest) => {
    const { panels } = get()
    const alreadyOpen = panels.find(p => p.manifest.id === manifest.id)
    if (alreadyOpen) return

    const pinnedPanels = panels.filter(p => p.pinned)
    const unpinnedPanels = panels.filter(p => !p.pinned)

    const newPanel: Panel = {
      id: manifest.id,
      manifest,
      pinned: false,
    }

    if (panels.length === 0) {
      set({ panels: [newPanel] })
      return
    }

    if (pinnedPanels.length === 0) {
      set({ panels: [newPanel] })
      return
    }

    if (pinnedPanels.length >= 2) {
      set({ panels: [...pinnedPanels.slice(0, 2)] })
      return
    }

    const next = [...pinnedPanels, ...unpinnedPanels.slice(1), newPanel].slice(0, 2)
    set({ panels: next })
  },

  closePanel: (id) => {
    set(state => ({ panels: state.panels.filter(p => p.id !== id) }))
  },

  togglePin: (id) => {
    set(state => ({
      panels: state.panels.map(p =>
        p.id === id ? { ...p, pinned: !p.pinned } : p
      ),
    }))
  },
}))