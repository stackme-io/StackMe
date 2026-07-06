import './i18n'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.tsx'
import './index.css'
import { ModulesProvider } from './context/ModulesContext'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <ModulesProvider>
        <App />
      </ModulesProvider>
    </ClerkProvider>
  </StrictMode>
)

// TEMP spike (Selenium-Java step 1): verify the Java wasm parser loads in prod.
// On the deployed Vercel preview, open the console and run:  await window.__ltmJavaSpike()
// Dynamic import keeps web-tree-sitter lazy (out of the main bundle). Remove after the gate.
;(window as unknown as { __ltmJavaSpike?: () => Promise<string> }).__ltmJavaSpike = async () => {
  const { parseJavaToSexp } = await import('./java/parser')
  const src = `public class T {
  org.openqa.selenium.By u = By.id("username");
  void t() { driver.findElement(By.xpath("//button[@id='go']")).click(); }
}`
  const sexp = await parseJavaToSexp(src)
  console.log('[LocateMe Java spike] parse OK:\n' + sexp)
  return sexp
}

