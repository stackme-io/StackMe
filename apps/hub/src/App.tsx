import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MODULE_REGISTRY } from './registry'
import AppShell from './layouts/AppShell'
import MarketMePage from './pages/MarketMe'
import AccountMePage from './pages/AccountMe'
import PanelLayout from './layouts/PanelLayout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/forge-me" replace />} />
          <Route path="/market-me" element={<MarketMePage />} />
          <Route path="/account-me" element={<AccountMePage />} />
          <Route path="*" element={<PanelLayout />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App