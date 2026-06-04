import type { AnomalyDefinition } from './types'

export const duplicatesAnomaly: AnomalyDefinition = {
  id:          'duplicates',
  label:       'Duplicates',
  description: 'Exact row copies — every field matches an existing row',
  status:      'active',
}