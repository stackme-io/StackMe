import { Link, Outlet, useLocation } from 'react-router-dom'
import { SignInButton, SignOutButton, useUser } from '@clerk/clerk-react'
import { MODULE_REGISTRY } from '../registry'

export default function AppShell() {
  const location = useLocation()
  const { isSignedIn, user } = useUser()

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{
        width: '220px',
        borderRight: '1px solid #e2e8f0',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '16px' }}>
          StackMe
        </div>

        {MODULE_REGISTRY.map((module) => (
          <Link
            key={module.id}
            to={module.route}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              textDecoration: 'none',
              color: location.pathname === module.route ? '#fff' : '#374151',
              background: location.pathname === module.route ? '#5B4FCF' : 'transparent',
              fontWeight: 500,
            }}
          >
            {module.name}
          </Link>
        ))}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isSignedIn ? (
            <>
              <div style={{ fontSize: '13px', color: '#6b7280', padding: '8px 12px' }}>
                {user.emailAddresses[0]?.emailAddress}
              </div>
              <SignOutButton>
                <button style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: 'transparent',
                  color: '#374151',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}>
                  Sign out
                </button>
              </SignOutButton>
            </>
          ) : (
            <SignInButton mode="modal">
              <button style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                background: '#5B4FCF',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}>
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      </aside>

      <main style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}