import { GenerateSection } from './GenerateSection'
import { AnalyzeSection } from './AnalyzeSection'
import { useTranslation } from 'react-i18next'

export default function ForgeMePage() {
  const { t } = useTranslation()

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-foreground mb-1">{t('forge.title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t('forge.subtitle')}</p>
      <GenerateSection />
      <AnalyzeSection />
    </div>
  )
}