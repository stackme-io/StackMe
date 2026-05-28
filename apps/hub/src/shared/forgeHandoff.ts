export interface ForgeHandoff {
  rows: Record<string, unknown>[]
  anomalies: {
    row_index: number
    column: string
    anomaly_type: string
    description?: string
    original_value?: string | null
  }[]
  format: string
  seed: number
  createdAt: number
}

let pending: ForgeHandoff | null = null

export function setHandoff(data: ForgeHandoff): void {
  pending = data
}

export function popHandoff(): ForgeHandoff | null {
  const data = pending
  pending = null
  return data
}