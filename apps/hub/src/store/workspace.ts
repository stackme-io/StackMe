import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModuleManifest } from '../types/module-manifest'
import { lazy } from 'react'
import { MODULE_REGISTRY } from '../registry'

const SYSTEM_MANIFESTS = [
  {
    id: 'market-me',
    name: 'MarketMe',
    description: '',
    icon: 'Store',
    route: '/market-me',
    category: 'analytics' as const,
    defaultForNewUsers: false,
    component: lazy(() => import('../pages/MarketMe')),
  },
]

const ALL_MANIFESTS = [...MODULE_REGISTRY, ...SYSTEM_MANIFESTS]

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
  persist(
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
    }),
    {
      name: 'stackme-workspace',
      partialize: (state: WorkspaceStore) => ({
        panels: state.panels.map((p: Panel) => ({
          id: p.id,
          pinned: p.pinned,
        })),
        activeId: state.activeId,
      }),
      merge: (persisted: unknown, current: WorkspaceStore) => {
        const saved = persisted as { panels: { id: string; pinned: boolean }[]; activeId: string | null }
        const restoredPanels: Panel[] = saved.panels
          .map(({ id, pinned }) => {
            const manifest = ALL_MANIFESTS.find(m => m.id === id)
            if (!manifest) return null
            return { id, manifest, pinned }
          })
          .filter((p): p is Panel => p !== null)

        return {
          ...current,
          panels: restoredPanels,
          activeId: saved.activeId,
        }
      },
    }
  )
)