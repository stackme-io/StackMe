import { useTranslation } from 'react-i18next'
import type { AnomalyInfo } from './types'

interface AnomalyTableProps {
  tableData: any[]
  anomalies: AnomalyInfo[]
  isTimestamp?: (col: string) => boolean
}

export function AnomalyTable({ tableData, anomalies, isTimestamp }: AnomalyTableProps) {
  const { t } = useTranslation()

  if (tableData.length === 0) return null

  const columns = Object.keys(tableData[0])

  const anomalyByCol = new Map<number, string[]>()
  anomalies.forEach(a => {
    const existing = anomalyByCol.get(a.row_index) ?? []
    anomalyByCol.set(a.row_index, [...existing, a.column])
  })

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/50">
            {columns.map(col => (
              <th key={col} className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border text-xs uppercase tracking-wide">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, i) => {
            const rowIndex = row.id !== undefined ? Number(row.id) - 1 : i
            const anomalyCols = new Set(anomalyByCol.get(rowIndex) ?? [])
            const isAnomaly = anomalyCols.size > 0

            return (
              <tr key={i} className={isAnomaly ? 'bg-amber-50 dark:bg-amber-950/20' : i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                {columns.map(col => (
                  <td key={col} className={`px-3 py-2 whitespace-nowrap border-b border-border/50 text-sm ${anomalyCols.has(col) ? 'text-amber-700 dark:text-amber-400 font-medium' : 'text-foreground'}`}
                    style={{ background: anomalyCols.has(col) ? 'rgb(254 243 199 / 0.5)' : 'transparent' }}
                  >
                    {row[col] === null || row[col] === undefined
                      ? <span className="text-destructive font-medium text-xs">NULL</span>
                      : isTimestamp?.(col)
                        ? new Date(Number(row[col])).toISOString().replace('T', ' ').slice(0, 19)
                        : String(row[col])}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}