interface ResultBarProps {
  rows: number
  anomalyCount: number
  format: string
  seed: number
  viewFilter: 'all' | 'anomalies'
  onFilterChange: (f: 'all' | 'anomalies') => void
  onExport: () => void
  onCopy: () => void
  copied: boolean
  t: (key: string) => string
}

export function ResultBar({
  rows, anomalyCount, format, seed,
  viewFilter, onFilterChange,
  onExport, onCopy, copied, t,
}: ResultBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-muted/30 border border-border mb-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Rows: <span className="font-medium text-foreground">{rows}</span></span>
        <span>Anomalies: <span className="font-medium text-amber-500">{anomalyCount}</span></span>
        <span>Format: <span className="font-medium text-foreground">{format}</span></span>
        <span>seed: <span className="font-mono text-foreground">{seed}</span></span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1 text-xs transition-colors ${
              viewFilter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('All rows')}
          </button>
          <button
            onClick={() => onFilterChange('anomalies')}
            className={`px-3 py-1 text-xs border-l border-border transition-colors ${
              viewFilter === 'anomalies'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ⚠ Anomalies only
          </button>
        </div>

        <button
          onClick={onCopy}
          title="Copy as TSV"
          className="flex items-center gap-1.5 px-3 py-1 text-xs border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <i className={`ti ${copied ? 'ti-check' : 'ti-clipboard'} text-sm`} />
          {copied ? 'Copied' : 'Copy'}
        </button>

        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1 text-xs border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <i className="ti ti-download text-sm" />
          Export {format}
        </button>
      </div>
    </div>
  )
}