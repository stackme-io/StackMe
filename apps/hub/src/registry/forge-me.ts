import { lazy } from 'react'
import type { ModuleManifest } from '../types/module-manifest'

export const forgeMeManifest: ModuleManifest = {
  id: 'forge-me',
  name: 'ForgeMe',
  description: 'Anomaly dataset generator and analyzer',
  icon: 'Hammer',
  route: '/forge-me',
  category: 'generation',
  defaultForNewUsers: true,
  component: lazy(() => import('../modules/forge-me')),
}