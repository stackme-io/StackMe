import { GenerateSection } from './GenerateSection'
import { AnalyzeSection } from './AnalyzeSection'

export default function ForgeMePage() {
  return (
    <div style={{ maxWidth: '960px' }}>
      <h1 style={{ marginBottom: '8px' }}>ForgeMe</h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        Anomaly dataset generator and analyzer
      </p>

      <GenerateSection />
      <AnalyzeSection />
    </div>
  )
}
