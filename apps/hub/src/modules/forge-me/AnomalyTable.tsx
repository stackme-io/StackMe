import type { AnomalyInfo } from './types'

interface AnomalyTableProps {
  tableData: any[]
  anomalies: AnomalyInfo[]
  selectedRowIndex: number | null
  onRowSelect: (index: number) => void
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
  if (t.includes('outlier'))                                  return 'outlier'
  if (t.includes('missing') || t.includes('null'))            return 'missing'
  if (t.includes('duplicate'))                                return 'duplicate'
  if (t.includes('type_mismatch') || t.includes('mismatch'))  return 'type_mismatch'
  if (t.includes('stale'))                                    return 'stale_timestamp'
  if (t.includes('out_of_order') || t.includes('order'))      return 'out_of_order'
  if (t.includes('late'))                                     return 'late_arrival'
  return 'outlier'
}

function isTimestampCol(col: string): boolean {
  const c = col.toLowerCase()
  return c.includes('timestamp') || c.includes('_at') || c === 'date' || c === 'time'
}

function colHeaderClass(col: string): string {
  if (col === 'id')            return 'w-[72px]'
  if (isTimestampCol(col))     return 'w-[160px]'
  return ''
}

function AnomalyBadge({ type }: { type: string }) {
  const normalized = normalizeType(type)
  const style = BADGE_STYLES[normalized] ?? 'bg-muted text-muted-foreground border-border'
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono whitespace-nowrap ${style}`}>
      {type.replace(/_/g, ' ')}
    </span>
  )
}

export function AnomalyTable({
  tableData, anomalies, selectedRowIndex, onRowSelect, isTimestamp,
}: AnomalyTableProps) {
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
    <div className="flex-1 rounded-lg border border-border max-h-[420px] overflow-y-auto overflow-x-hidden min-w-0">
      <table className="w-full text-sm border-collapse table-fixed">
        <thead className="sticky top-0 z-10">
          <tr className="bg-muted/40 backdrop-blur-sm">
            {columns.map(col => (
              <th
                key={col}
                className={`px-3 py-2.5 text-left font-medium text-foreground/60 truncate border-b border-border text-[10px] uppercase tracking-wider ${colHeaderClass(col)}`}
              >
                {col}
              </th>
            ))}
            <th className="px-3 py-2.5 text-left font-medium text-foreground/60 border-b border-border text-[10px] uppercase tracking-wider w-28">
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
            const isSelected  = selectedRowIndex === rowIndex

            return (
              <tr
                key={i}
                onClick={() => onRowSelect(rowIndex)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-primary/10'
                    : isAnomaly
                    ? 'bg-amber-950/10 hover:bg-amber-950/30'
                    : i % 2 === 0
                    ? 'bg-background hover:bg-muted/30'
                    : 'bg-muted/10 hover:bg-muted/30'
                }`}
              >
                {columns.map(col => {
                  const isAnomalyCell = anomalyCols.has(col)
                  const isId          = col === 'id'
                  const value         = row[col]
                  return (
                    <td
                      key={col}
                      className={`px-3 py-2 truncate border-b border-border/40 ${
                        isId
                          ? 'text-xs font-mono text-muted-foreground/50'
                          : isAnomalyCell
                          ? 'text-sm text-amber-400 font-medium'
                          : 'text-sm text-foreground'
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
                  {isAnomaly && anomaly ? <AnomalyBadge type={anomaly.type} /> : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}