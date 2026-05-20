import type { AnomalyInfo } from './types'

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
  if (t.includes('outlier'))                                return 'outlier'
  if (t.includes('missing') || t.includes('null'))          return 'missing'
  if (t.includes('duplicate'))                              return 'duplicate'
  if (t.includes('type_mismatch') || t.includes('mismatch')) return 'type_mismatch'
  if (t.includes('stale'))                                  return 'stale_timestamp'
  if (t.includes('out_of_order') || t.includes('order'))    return 'out_of_order'
  if (t.includes('late'))                                   return 'late_arrival'
  return 'outlier'
}

interface RowInspectProps {
  rowIndex: number
  rowData: Record<string, unknown>
  anomalies: AnomalyInfo[]
  onClose: () => void
}

export function RowInspect({ rowIndex, rowData, anomalies, onClose }: RowInspectProps) {
  const rowAnomalies = anomalies.filter(a => a.row_index === rowIndex)

  return (
    <div className="w-64 flex-shrink-0 border-l border-border bg-background flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-xs font-medium text-foreground">Row #{rowIndex + 1}</p>
        <button
          onClick={onClose}
          className="text-muted-foreground/50 hover:text-foreground transition-colors text-sm"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">

        {rowAnomalies.length === 0 ? (
          <p className="text-xs text-muted-foreground/50">No anomalies in this row</p>
        ) : (
          rowAnomalies.map((a, i) => {
            const normalized = normalizeType(a.anomaly_type)
            const style = BADGE_STYLES[normalized] ?? 'bg-muted text-muted-foreground border-border'
            return (
              <div key={i} className="flex flex-col gap-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono self-start ${style}`}>
                  {a.anomaly_type.replace(/_/g, ' ')}
                </span>
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-muted-foreground/50">column</span>
                    <span className="text-xs text-foreground font-mono">{a.column}</span>
                  </div>
                  {a.original_value !== null && (
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] text-muted-foreground/50">original</span>
                      <span className="text-xs text-foreground font-mono">{a.original_value}</span>
                    </div>
                  )}
                  {a.description && (
                    <p className="text-[10px] text-muted-foreground/75 mt-0.5 leading-relaxed">
                      {a.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })
        )}

        <div className="border-t border-border/50 pt-3 mt-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 mb-2">Row data</p>
          <div className="flex flex-col gap-1">
            {Object.entries(rowData).map(([key, val]) => (
              <div key={key} className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">{key}</span>
                <span className="text-[10px] text-foreground font-mono truncate text-right">
                  {val === null || val === undefined ? (
                    <span className="text-red-400">NULL</span>
                  ) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}