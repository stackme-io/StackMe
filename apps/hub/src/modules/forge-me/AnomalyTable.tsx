import type { AnomalyInfo } from './types'

interface AnomalyTableProps {
  tableData: any[]
  anomalies: AnomalyInfo[]
  isTimestamp?: (col: string) => boolean
}

const BADGE_STYLES: Record<string, string> = {
  outlier:         'bg-amber-950/40 text-amber-400 border-amber-900',
  missing:         'bg-red-950/40 text-red-400 border-red-900',
  duplicate:       'bg-blue-950/40 text-blue-400 border-blue-900',
  type_mismatch:   'bg-purple-950/40 text-purple-400 border-purple-900',
  stale_timestamp: 'bg-cyan-950/40 text-cyan-400 border-cyan-900',
  out_of_order:    'bg-orange-950/40 text-orange-400 border-orange-900',
  late_arrival:    'bg-rose-950/40 text-rose-400 border-rose-900',
}

function normalizeType(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('outlier'))                          return 'outlier'
  if (t.includes('missing') || t.includes('null'))    return 'missing'
  if (t.includes('duplicate'))                        return 'duplicate'
  if (t.includes('type_mismatch') || t.includes('mismatch')) return 'type_mismatch'
  if (t.includes('stale'))                            return 'stale_timestamp'
  if (t.includes('out_of_order') || t.includes('order')) return 'out_of_order'
  if (t.includes('late'))                             return 'late_arrival'
  return 'outlier'
}

function AnomalyBadge({ type }: { type: string }) {
  const normalized = normalizeType(type)
  const style = BADGE_STYLES[normalized] ?? 'bg-muted text-muted-foreground border-border'
  const label = type.replace(/_/g, ' ')

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono whitespace-nowrap ${style}`}>
      {label}
    </span>
  )
}

export function AnomalyTable({ tableData, anomalies, isTimestamp }: AnomalyTableProps) {
  if (tableData.length === 0) return null

  const columns = Object.keys(tableData[0])

  const anomalyMap = new Map<number, { cols: Set<string>; type: string }>()
  anomalies.forEach(a => {
    const existing = anomalyMap.get(a.row_index)
    if (existing) {
      existing.cols.add(a.column)
    } else {
      anomalyMap.set(a.row_index, { cols: new Set([a.column]), type: a.anomaly_type })
    }
  })

  return (
    <div className="rounded-lg border border-border max-h-[420px] overflow-y-auto overflow-x-hidden">
      <table className="w-full text-sm border-collapse table-fixed">
        <thead className="sticky top-0 z-10">
          <tr className="bg-muted/30 backdrop-blur-sm">
            {columns.map(col => (
              <th
                key={col}
                className="px-3 py-2.5 text-left font-medium text-muted-foreground truncate border-b border-border text-[10px] uppercase tracking-wider"
              >
                {col}
              </th>
            ))}
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground border-b border-border text-[10px] uppercase tracking-wider w-28">
              type
            </th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, i) => {
            const rowIndex    = row.id !== undefined ? Number(row.id) - 1 : i
            const anomaly     = anomalyMap.get(rowIndex)
            const isAnomaly   = !!anomaly
            const anomalyCols = anomaly?.cols ?? new Set<string>()

            return (
              <tr
                key={i}
                className={
                  isAnomaly
                    ? 'bg-amber-950/10'
                    : i % 2 === 0
                    ? 'bg-background'
                    : 'bg-muted/10'
                }
              >
                {columns.map(col => {
                  const isAnomalyCell = anomalyCols.has(col)
                  const value = row[col]

                  return (
                    <td
                      key={col}
                      className={`px-3 py-2 truncate border-b border-border/40 text-sm ${
                        isAnomalyCell ? 'text-amber-400 font-medium' : 'text-foreground'
                      }`}
                    >
                      {value === null || value === undefined ? (
                        <span className="text-red-500 font-mono text-xs font-semibold">NULL</span>
                      ) : isTimestamp?.(col) ? (
                        new Date(Number(value)).toISOString().replace('T', ' ').slice(0, 19)
                      ) : (
                        String(value)
                      )}
                    </td>
                  )
                })}
                <td className="px-3 py-2 border-b border-border/40 w-28">
                  {isAnomaly && anomaly ? (
                    <AnomalyBadge type={anomaly.type} />
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}