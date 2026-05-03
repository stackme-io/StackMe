import type { AnomalyInfo } from './types'

interface AnomalyTableProps {
  tableData: any[]
  anomalies: AnomalyInfo[]
  isTimestamp?: (col: string) => boolean
}

const BADGE_STYLES: Record<string, string> = {
  outlier:   'bg-amber-950/40 text-amber-400 border-amber-900',
  missing:   'bg-red-950/40 text-red-400 border-red-900',
  duplicate: 'bg-blue-950/40 text-blue-400 border-blue-900',
}

function AnomalyBadge({ type }: { type: string }) {
  const normalized = type.toLowerCase().includes('outlier')   ? 'outlier'
                   : type.toLowerCase().includes('missing') ||
                     type.toLowerCase().includes('null')      ? 'missing'
                   : type.toLowerCase().includes('duplicate') ? 'duplicate'
                   : 'outlier'

  const style = BADGE_STYLES[normalized] ?? 'bg-muted text-muted-foreground border-border'

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${style}`}>
      {type}
    </span>
  )
}

export function AnomalyTable({ tableData, anomalies, isTimestamp }: AnomalyTableProps) {
  if (tableData.length === 0) return null

  const columns = Object.keys(tableData[0])

  // row_index → { cols: Set<string>, type: string }
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
    <div className="overflow-auto rounded-lg border border-border max-h-[420px]">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-muted/30 backdrop-blur-sm">
            {columns.map(col => (
              <th
                key={col}
                className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border text-[10px] uppercase tracking-wider"
              >
                {col}
              </th>
            ))}
            {/* Колонка TYPE */}
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border text-[10px] uppercase tracking-wider">
              type
            </th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, i) => {
            const rowIndex   = row.id !== undefined ? Number(row.id) - 1 : i
            const anomaly    = anomalyMap.get(rowIndex)
            const isAnomaly  = !!anomaly
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
                      className={`px-3 py-2 whitespace-nowrap border-b border-border/40 text-sm ${
                        isAnomalyCell
                          ? 'text-amber-400 font-medium'
                          : 'text-foreground'
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
                {/* TYPE колонка */}
                <td className="px-3 py-2 whitespace-nowrap border-b border-border/40">
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