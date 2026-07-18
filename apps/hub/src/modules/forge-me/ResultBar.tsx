interface ResultBarProps {
  rows: number
  anomalyCount: number
  format: string
  seed: number
  viewFilter: 'all' | 'anomalies'
  onFilterChange: (f: 'all' | 'anomalies') => void
  onExport: () => void
  onCopy: () => void
  onAnalyze?: () => void
  analyzeInstalled?: boolean
  copied: boolean
  exported: boolean
  t: (key: string, opts?: object) => string
}

export function ResultBar({
  rows, anomalyCount, format, seed,
  viewFilter, onFilterChange,
  onExport, onCopy, onAnalyze, analyzeInstalled = true, copied, exported, t,
}: ResultBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-muted/30 border border-border mb-3">
      <div className="flex items-center text-xs text-muted-foreground">
        <span>{rows} rows</span>
        <span className="mx-3 text-sm text-muted-foreground/50">·</span>
        <span className="text-amber-500">{anomalyCount} anomalies</span>
        <span className="mx-3 text-sm text-muted-foreground/50">·</span>
        <span>{format}</span>
        <span className="mx-3 text-sm text-muted-foreground/50">·</span>
        <span>seed {seed}</span>
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
            {t('allRows')}
          </button>
          <button
            onClick={() => onFilterChange('anomalies')}
            className={`px-3 py-1 text-xs border-l border-border transition-colors ${
              viewFilter === 'anomalies'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ⚠ {t('anomaliesOnly')}
          </button>
        </div>

        <button
          onClick={onCopy}
          title={t('copyTsv')}
          className="flex items-center justify-center gap-1.5 w-[76px] py-1 text-xs border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <i className={`ti ${copied ? 'ti-check' : 'ti-clipboard'} text-sm`} />
          {copied ? t('copied') : t('copy')}
        </button>

        <button
          onClick={onExport}
          className="flex items-center justify-center gap-1.5 w-[104px] py-1 text-xs border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <i className={`ti ${exported ? 'ti-check' : 'ti-download'} text-sm`} />
          {exported ? t('exported') : t('exportLabel', { format })}
        </button>

        {onAnalyze && (
          <div className="relative group">
            <button
              onClick={onAnalyze}
              className="flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-medium border border-border rounded-md text-muted-foreground hover:text-orange-300 hover:border-orange-400/40 hover:bg-orange-950/30 transition-colors"
            >
              <i className="ti ti-chart-bar text-sm" />
              AnalyzeMe
            </button>
            {!analyzeInstalled && (
              <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-20 w-52 px-2.5 py-2 rounded-lg border border-border bg-background shadow-lg text-[10px] text-muted-foreground/95 leading-relaxed whitespace-normal">
                Install <span className="text-primary">AnalyzeMe</span> via MarketMe to unlock this feature.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}