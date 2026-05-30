import type { AnomalyType } from '../types'

export interface AnomalyDefinition {
  id: AnomalyType
  label: string
  description: string
  status: 'active' | 'coming_soon'
}