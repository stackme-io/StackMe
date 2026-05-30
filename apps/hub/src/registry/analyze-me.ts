import { lazy } from 'react'
import type { ModuleManifest } from '../types/module-manifest'

const AnalyzeMePage = lazy(() => import('../modules/analyze-me/index'))

export const analyzeMeManifest: ModuleManifest = {
  id: 'analyze-me',
  name: 'AnalyzeMe',
  description: 'Upload a CSV or JSON and detect missing values, duplicates, and outliers entirely in your browser. No server, no uploads, no logs — powered by DuckDB-Wasm.',
  icon: 'ScanSearch',
  route: '/analyze-me',
  category: 'analytics',
  defaultForNewUsers: false,
  component: AnalyzeMePage,
}