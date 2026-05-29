import type { AnomalyInfo } from './types'

interface InjectedAnomaly {
  row_index: number
  column: string
  anomaly_type: string
}

interface AnomalyTableProps {
  tableData: any[]
  anomalies: AnomalyInfo[]
  injectedAnomalies?: InjectedAnomaly[]
}

const BADGE_STYLES: Record<string, string> = {
  outlier:   'bg-amber-950/40 text-amber-400 border-amber-900',
  missing:   'bg-red-950/40 text-red-400 border-red-900',
  duplicate: 'bg-blue-950/40 text-blue-400 border-blue-900',
}

function AnomalyBadge({ type }: { type: string }) {
  const style = BADGE_STYLES[type] ?? 'bg-muted text-muted-foreground border-border'
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono whitespace-nowrap ${style}`}>
      {type}
    </span>
  )
}

type Verdict = 'detected' | 'missed' | 'false_positive'

const VERDICT_STYLES: Record<Verdict, string> = {
  detected:       'text-green-400',
  missed:         'text-amber-400',
  false_positive: 'text-red-400',
}

const VERDICT_LABELS: Record<Verdict, string> = {
  detected:       '✓ detected',
  missed:         '✗ missed',
  false_positive: '⚠ false positive',
}

export function AnomalyTable({ tableData, anomalies, injectedAnomalies = [] }: AnomalyTableProps) {
  if (tableData.length === 0) return null

  const columns = Object.keys(tableData[0]).filter(c => c !== '_row_index')
  const hasInjected = injectedAnomalies.length > 0

  const anomalyMap = new Map<number, { cols: Set<string>; types: string[] }>()
  anomalies.forEach(a => {
    const existing = anomalyMap.get(a.row_index)
    if (existing) {
      existing.cols.add(a.column)
      if (!existing.types.includes(a.anomaly_type)) existing.types.push(a.anomaly_type)
    } else {
      anomalyMap.set(a.row_index, { cols: new Set([a.column]), types: [a.anomaly_type] })
    }
  })

  const injectedSet = new Set(injectedAnomalies.map(a => a.row_index))

  return (
    <div className="rounded-lg border border-border max-h-[680px] overflow-y-auto overflow-x-hidden">
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
            {hasInjected && (
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground border-b border-border text-[10px] uppercase tracking-wider w-32">
                verdict
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, i) => {
            const rowIndex    = Number(row._row_index ?? i)
            const anomaly     = anomalyMap.get(rowIndex)
            const isAnomaly   = !!anomaly
            const anomalyCols = anomaly?.cols ?? new Set<string>()
            const isInjected  = injectedSet.has(rowIndex)
            const isDetected  = isAnomaly

            let verdict: Verdict | null = null
            if (hasInjected) {
              if (isInjected && isDetected)  verdict = 'detected'
              if (isInjected && !isDetected) verdict = 'missed'
              if (!isInjected && isDetected) verdict = 'false_positive'
            }

            return (
              <tr
                key={i}
                className={
                  isAnomaly
                    ? anomaly?.types.includes('duplicate')
                      ? 'bg-blue-950/10'
                      : anomaly?.types.includes('outlier')
                      ? 'bg-amber-950/10'
                      : 'bg-red-950/10'
                    : i % 2 === 0
                    ? 'bg-background'
                    : 'bg-muted/10'
                }
              >
                {columns.map(col => {
                  const isAnomalyCell = anomalyCols.has(col) || (anomalyCols.has('*') && isAnomaly)
                  const value = row[col]
                  return (
                    <td
                      key={col}
                      className={`px-3 py-2 truncate border-b border-border/40 text-sm ${
                        isAnomalyCell ? 'text-amber-400 font-medium' : 'text-foreground'
                      }`}
                    >
                      {value === null || value === undefined || value === '' ? (
                        <span className="text-red-500 font-mono text-xs font-semibold">NULL</span>
                      ) : col.toLowerCase().includes('timestamp') && !isNaN(Number(value)) ? (
                        new Date(Number(value)).toISOString().replace('T', ' ').slice(0, 19)
                      ) : (
                        String(value)
                      )}
                    </td>
                  )
                })}
                <td className="px-3 py-2 border-b border-border/40 w-28">
                  {isAnomaly && anomaly ? (
                    <div className="flex flex-col gap-0.5 w-fit">
                      {anomaly.types.map(t => <AnomalyBadge key={t} type={t} />)}
                    </div>
                  ) : null}
                </td>
                {hasInjected && (
                  <td className="px-3 py-2 border-b border-border/40 w-32">
                    {verdict && (
                      <div className="relative group inline-block">
                        <span className={`text-[10px] font-mono cursor-default ${VERDICT_STYLES[verdict]}`}>
                          {VERDICT_LABELS[verdict]}
                        </span>
                        {verdict !== 'detected' && (
                          <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-20 w-52 px-2.5 py-2 rounded-lg border border-border bg-background shadow-lg text-[10px] text-muted-foreground/70 leading-relaxed whitespace-normal">
                            {verdict === 'missed'
                              ? 'Injected anomaly was not detected. Try increasing sensitivity in the left panel.'
                              : 'Detected but not injected — may be a real anomaly or a false alarm. Lower sensitivity to reduce noise.'}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}