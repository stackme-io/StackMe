import type { AnomalyDefinition } from './types'

export const staleTimestampsAnomaly: AnomalyDefinition = {
  id:          'stale-timestamps',
  label:       'Stale timestamps',
  description: 'Timestamps frozen or repeating across rows',
  status:      'coming_soon',
}