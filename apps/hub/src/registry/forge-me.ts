import { lazy } from 'react'
import type { ModuleManifest } from '../types/module-manifest'

export const forgeMeManifest: ModuleManifest = {
  id: 'forge-me',
  name: 'ForgeMe',
  description: 'Generate synthetic datasets with injected anomalies - nulls, duplicates, outliers and more. Define your schema, set the rate, then export or pipe directly into AnalyzeMe.',
  icon: 'Hammer',
  route: '/forge-me',
  category: 'generation',
  defaultForNewUsers: true,
  beta: true,
  component: lazy(() => import('../modules/forge-me')),
}