import type { AnomalyDefinition } from './types'

export const duplicatesAnomaly: AnomalyDefinition = {
  id:          'duplicates',
  label:       'Duplicates',
  description: 'Injects exact duplicate rows',
  status:      'active',
}