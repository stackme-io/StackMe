import type { AnomalyDefinition } from './types'

export const nullsAnomaly: AnomalyDefinition = {
  id:          'nulls',
  label:       'Nulls',
  description: 'Injects NULL values into random cells',
  status:      'active',
}