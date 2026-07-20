import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './layouts/AppShell'
import AccountMePage from './pages/AccountMe'
import NotifyMePage from './pages/NotifyMe'
import SupportMePage from './pages/SupportMe'
import PanelLayout from './layouts/PanelLayout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/market-me" replace />} />
          <Route path="/account-me" element={<AccountMePage />} />
          <Route path="/notify-me" element={<NotifyMePage />} />
          <Route path="/support-me" element={<SupportMePage />} />
          <Route path="*" element={<PanelLayout />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App