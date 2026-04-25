import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MODULE_REGISTRY } from './registry'
import AppShell from './layouts/AppShell'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/forge-me" replace />} />
          {MODULE_REGISTRY.map((module) => (
            <Route
              key={module.id}
              path={module.route}
              element={
                <Suspense fallback={<div>Загрузка...</div>}>
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