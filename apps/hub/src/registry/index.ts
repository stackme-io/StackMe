import type { ModuleManifest } from '../types/module-manifest'
import { forgeMeManifest } from './forge-me'
import { analyzeMeManifest } from './analyze-me'

export const MODULE_REGISTRY: ModuleManifest[] = [
  forgeMeManifest,
  analyzeMeManifest,
]