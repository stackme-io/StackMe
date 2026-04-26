import { useState, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { MODULE_REGISTRY } from '../registry'
import apiClient from '../api/client'

interface ModuleState {
  [moduleId: string]: 'active' | 'loading' | 'inactive'
}

export default function MarketplacePage() {
  const { isSignedIn, user } = useUser()
  const { openSignIn } = useClerk()
  const [moduleStates, setModuleStates] = useState<ModuleState>({})
  const [loadingModules, setLoadingModules] = useState(true)

  useEffect(() => {
    if (!isSignedIn) {
      setLoadingModules(false)
      return
    }
    fetchActiveModules()
  }, [isSignedIn])

  const fetchActiveModules = async () => {
    try {
      const token = await window.Clerk.session.getToken()
      const response = await apiClient.get('/api/me/modules', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const activeIds: string[] = response.data.modules
      const states: ModuleState = {}
      MODULE_REGISTRY.forEach(m => {
        states[m.id] = activeIds.includes(m.id) ? 'active' : 'inactive'
      })
      setModuleStates(states)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingModules(false)
    }
  }

  const handleActivate = async (moduleId: string) => {
    if (!isSignedIn) {
      openSignIn()
      return
    }

    setModuleStates(prev => ({ ...prev, [moduleId]: 'loading' }))

    try {
      const token = await window.Clerk.session.getToken()
      await apiClient.post(
        '/api/modules/activate',
        { module_id: moduleId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setModuleStates(prev => ({ ...prev, [moduleId]: 'active' }))
    } catch (err) {
      console.error(err)
      setModuleStates(prev => ({ ...prev, [moduleId]: 'inactive' }))
    }
  }

  const handleDeactivate = async (moduleId: string) => {
    setModuleStates(prev => ({ ...prev, [moduleId]: 'loading' }))

    try {
      const token = await window.Clerk.session.getToken()
      await apiClient.delete(`/api/modules/${moduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setModuleStates(prev => ({ ...prev, [moduleId]: 'inactive' }))
    } catch (err) {
      console.error(err)
      setModuleStates(prev => ({ ...prev, [moduleId]: 'active' }))
    }
  }

  const categoryColors: Record<string, string> = {
    generation: '#5B4FCF',
    analytics: '#0F6E56',
    testing: '#854F0B',
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ marginBottom: '8px' }}>MarketMe</h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        Add tools to your workspace
      </p>

      {!isSignedIn && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          background: '#f5f3ff',
          border: '1px solid #e0e7ff',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#374151',
        }}>
          <strong>Sign in</strong> to activate tools and save your workspace.{' '}
          <button
            onClick={() => openSignIn()}
            style={{
              background: 'none',
              border: 'none',
              color: '#5B4FCF',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px',
              padding: 0,
            }}
          >
            Sign in →
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {MODULE_REGISTRY.map((module) => {
          const state = moduleStates[module.id] ?? 'inactive'
          const isActive = state === 'active'
          const isLoading = state === 'loading'

          return (
            <div
              key={module.id}
              style={{
                padding: '20px 24px',
                borderRadius: '12px',
                border: `1px solid ${isActive ? '#5B4FCF' : '#e5e7eb'}`,
                background: isActive ? '#f5f3ff' : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    padding: '2px 10px',
                    borderRadius: '99px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: categoryColors[module.category] ?? '#6b7280',
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {module.category}
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    {module.name}
                  </h3>
                </div>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  {module.description}
                </p>
              </div>

              <button
                onClick={() => isActive ? handleDeactivate(module.id) : handleActivate(module.id)}
                disabled={isLoading || loadingModules}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: isActive ? '1px solid #e5e7eb' : 'none',
                  background: isActive ? '#fff' : '#5B4FCF',
                  color: isActive ? '#374151' : '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  minWidth: '100px',
                }}
              >
                {isLoading ? '...' : isActive ? 'Remove' : isSignedIn ? 'Add' : 'Sign in to add'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}