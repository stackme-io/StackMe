import type { AnomalyDefinition } from './types'

export const typeMismatchesAnomaly: AnomalyDefinition = {
  id:          'type-mismatches',
  label:       'Type mismatches',
  description: 'Values that contradict the column\'s inferred type',
  status:      'coming_soon',
}