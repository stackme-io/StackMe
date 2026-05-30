import type { AnomalyDefinition } from './types'

export const outliersAnomaly: AnomalyDefinition = {
  id:          'outliers',
  label:       'Outliers',
  description: 'Injects statistically extreme values (IQR-based)',
  status:      'active',
}