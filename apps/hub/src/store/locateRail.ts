import { create } from 'zustand'

// Ephemeral UI state for the LocateMe left rail. Lives outside the page so the
// app header (AppShell) can host the collapse toggle (variant B) while the rail
// itself renders inside the LocateMe module. Not persisted - resets on reload.
interface LocateRailStore {
  open: boolean
  available: boolean
  toggle: () => void
  setOpen: (open: boolean) => void
  setAvailable: (available: boolean) => void
}

export const useLocateRail = create<LocateRailStore>((set) => ({
  open: true,
  available: false,
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  setAvailable: (available) => set({ available }),
}))
