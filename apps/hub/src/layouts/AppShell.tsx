import { Link, Outlet, useLocation } from 'react-router-dom'
import { MODULE_REGISTRY } from '../registry'

export default function AppShell() {
  const location = useLocation()

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
      </aside>

      <main style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}