import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import apiClient from '../api/client'

interface ModulesContextType {
  activeModuleIds: string[]
  refresh: () => Promise<void>
}

const ModulesContext = createContext<ModulesContextType>({
  activeModuleIds: [],
  refresh: async () => {},
})

export function ModulesProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useUser()
  const { getToken } = useAuth()
  const [activeModuleIds, setActiveModuleIds] = useState<string[]>([])

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setActiveModuleIds([])
      return
    }
    try {
      const token = await getToken()
      const res = await apiClient.get('/api/me/modules', {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log('modules refreshed:', res.data.modules)
      setActiveModuleIds(res.data.modules)
    } catch (err) {
      console.error(err)
    }
  }, [isSignedIn, getToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <ModulesContext.Provider value={{ activeModuleIds, refresh }}>
      {children}
    </ModulesContext.Provider>
  )
}

export function useModules() {
  return useContext(ModulesContext)
}