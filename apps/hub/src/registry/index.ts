import type { ModuleManifest } from '../types/module-manifest'
import { forgeMeManifest } from './forge-me'

export const MODULE_REGISTRY: ModuleManifest[] = [
  forgeMeManifest,
]