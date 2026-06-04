import type { AnomalyDefinition } from './types'

export const outliersAnomaly: AnomalyDefinition = {
  id:          'outliers',
  label:       'Outliers',
  description: 'Values far outside the normal range — IQR × 1.5 (≈ 2.7σ)',
  status:      'active',
}