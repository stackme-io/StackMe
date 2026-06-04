import type { AnomalyDefinition } from './types'

export const nullsAnomaly: AnomalyDefinition = {
  id:          'nulls',
  label:       'Nulls',
  description: 'Random fields go missing — NULL in numeric, text, or date columns',
  status:      'active',
}