export { nullsAnomaly } from './nulls'
export { duplicatesAnomaly } from './duplicates'
export { outliersAnomaly } from './outliers'
export { outOfOrderAnomaly } from './outOfOrder'
export { lateArrivalsAnomaly } from './lateArrivals'
export { typeMismatchesAnomaly } from './typeMismatches'
export { staleTimestampsAnomaly } from './staleTimestamps'

import { nullsAnomaly } from './nulls'
import { duplicatesAnomaly } from './duplicates'
import { outliersAnomaly } from './outliers'
import { outOfOrderAnomaly } from './outOfOrder'
import { lateArrivalsAnomaly } from './lateArrivals'
import { typeMismatchesAnomaly } from './typeMismatches'
import { staleTimestampsAnomaly } from './staleTimestamps'
import type { AnomalyDefinition } from './types'

export const ANOMALY_REGISTRY: AnomalyDefinition[] = [
  nullsAnomaly,
  duplicatesAnomaly,
  outliersAnomaly,
  outOfOrderAnomaly,
  lateArrivalsAnomaly,
  typeMismatchesAnomaly,
  staleTimestampsAnomaly,
]