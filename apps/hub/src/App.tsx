import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MODULE_REGISTRY } from './registry'
import AppShell from './layouts/AppShell'
import MarketMePage from './pages/MarketMe'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/forge-me" replace />} />
          <Route path="/market-me" element={<MarketMePage />} />
          {MODULE_REGISTRY.map((module) => (
            <Route
              key={module.id}
              path={module.route}
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <module.component />
                </Suspense>
              }
            />
          ))}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App