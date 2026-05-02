import { lazy } from 'react'
import type { ModuleManifest } from '../types/module-manifest'

const AnalyzeMePage = lazy(() => import('../modules/analyze-me/index'))

export const analyzeMeManifest: ModuleManifest = {
  id: 'analyze-me',
  name: 'AnalyzeMe',
  description: 'Detect anomalies in your real datasets before they reach production.',
  icon: 'ScanSearch',
  route: '/analyze-me',
  category: 'analytics',
  defaultForNewUsers: false,
  component: AnalyzeMePage,
}