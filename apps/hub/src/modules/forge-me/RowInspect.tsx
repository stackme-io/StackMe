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
  if (t.includes('outlier'))                                  return 'outlier'
  if (t.includes('missing') || t.includes('null'))            return 'missing'
  if (t.includes('duplicate'))                                return 'duplicate'
  if (t.includes('type_mismatch') || t.includes('mismatch'))  return 'type_mismatch'
  if (t.includes('stale'))                                    return 'stale_timestamp'
  if (t.includes('out_of_order') || t.includes('order'))      return 'out_of_order'
  if (t.includes('late'))                                     return 'late_arrival'
  return 'outlier'
}

interface RowInspectProps {
  rowIndex: number | null
  rowData: Record<string, unknown> | null
  anomalies: AnomalyInfo[]
  hiddenByFilter: boolean
  onClose: () => void
  onShowAll: () => void
}

export function RowInspect({
  rowIndex, rowData, anomalies,
  hiddenByFilter, onClose, onShowAll,
}: RowInspectProps) {
  const rowAnomalies = rowIndex !== null
    ? anomalies.filter(a => a.row_index === rowIndex)
    : []

  return (
    <div className="w-80 flex-shrink-0 border-l border-border bg-background flex flex-col overflow-hidden">

      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
          {rowIndex !== null ? `Row #${rowIndex + 1}` : 'Inspector'}
        </p>
        <button
          onClick={onClose}
          className="text-muted-foreground/40 hover:text-foreground transition-colors text-xs"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">

        {rowIndex === null && (
          <div className="flex flex-col gap-1.5 mt-2">
            <p className="text-sm font-medium text-foreground">No anomalies found</p>
            <p className="text-xs text-muted-foreground/50">
              Try increasing the anomaly rate or row count.
            </p>
          </div>
        )}

        {rowIndex !== null && hiddenByFilter && (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-xs text-muted-foreground/75">
              Selected row is hidden by current filter.
            </p>
            <button
              onClick={onShowAll}
              className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors text-left"
            >
              Show all rows →
            </button>
          </div>
        )}

        {rowIndex !== null && !hiddenByFilter && (
          <>
            {rowAnomalies.length === 0 ? (
              <div className="flex flex-col gap-1 mt-2">
                <p className="text-sm font-medium text-foreground">Healthy row</p>
                <p className="text-xs text-muted-foreground/50">No anomalies detected</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {rowAnomalies.map((a, i) => {
                  const normalized = normalizeType(a.anomaly_type)
                  const style = BADGE_STYLES[normalized] ?? 'bg-muted text-muted-foreground border-border'
                  return (
                    <div key={i} className="flex flex-col gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-mono font-semibold self-start ${style}`}>
                        {a.anomaly_type.replace(/_/g, ' ')}
                      </span>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs text-muted-foreground/50 flex-shrink-0">column</span>
                          <span className="text-xs text-foreground font-mono">{a.column}</span>
                        </div>
                        {a.original_value !== null && (
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs text-muted-foreground/50 flex-shrink-0">original</span>
                            <span className="text-xs text-foreground font-mono">{a.original_value}</span>
                          </div>
                        )}
                        {a.description && (
                          <p className="text-xs text-muted-foreground/75 leading-relaxed mt-0.5">
                            {a.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {rowData && (
              <div className="border-t border-border/40 pt-3 mt-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2">
                  Row data
                </p>
                <div className="flex flex-col gap-1">
                  {Object.entries(rowData).map(([key, val]) => (
                    <div key={key} className="flex items-baseline justify-between gap-2">
                      <span className="text-xs text-muted-foreground/50 flex-shrink-0">{key}</span>
                      <span className="text-xs text-foreground font-mono break-all text-right">
                        {val === null || val === undefined
                          ? <span className="text-red-400">NULL</span>
                          : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}