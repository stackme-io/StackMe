import type { ComponentType, LazyExoticComponent } from 'react'

export interface ModuleManifest {
  id: string
  name: string
  description: string
  icon: string
  route: string
  category: 'analytics' | 'testing' | 'generation'
  defaultForNewUsers: boolean
  component: LazyExoticComponent<ComponentType>
}