import { lazy } from 'react'
import type { ModuleManifest } from '../types/module-manifest'

export const locateMeManifest: ModuleManifest = {
  id: 'locate-me',
  name: 'LocateMe',
  description: 'Static locator-fragility audit for Playwright/TypeScript test suites.',
  icon: 'Anchor',
  route: '/locate-me',
  category: 'testing',
  defaultForNewUsers: true,
  beta: true,
  component: lazy(() => import('../modules/locate-me')),
}
