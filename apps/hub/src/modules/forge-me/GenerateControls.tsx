import type { AnomalyType } from './types'

const MAX_ROWS = 1000

interface GenerateControlsProps {
  format: string
  rows: number
  anomalyRate: number
  seed: number
  isLoading: boolean
  rowError: boolean
  onFormatChange: (v: string) => void
  onRowsChange: (v: number) => void
  onAnomalyRateChange: (v: number) => void
  onSeedChange: (v: number) => void
  onGenerate: () => void
  selectedAnomalies: Set<AnomalyType>
  t: (key: string, opts?: object) => string
}

export function GenerateControls({
  format, rows, anomalyRate, seed, isLoading, rowError,
  onFormatChange, onRowsChange, onAnomalyRateChange, onSeedChange,
  onGenerate, selectedAnomalies, t,
}: GenerateControlsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 items-start">

        <div className="flex flex-col gap-1.5 w-[180px]">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('format')}
          </label>
          <select
            value={format}
            onChange={e => onFormatChange(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="JSON">JSON</option>
            <option value="CSV">CSV</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center justify-between">
            {t('rowCount')}
            <span className="text-[10px] normal-case tracking-normal font-normal text-muted-foreground/50">
              {t('rowLimitHint', { max: MAX_ROWS })}
            </span>
          </label>
          <input
            type="number"
            value={rows}
            onChange={e => onRowsChange(Number(e.target.value))}
            min={1}
            max={MAX_ROWS}
            className={`px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
              rowError ? 'border-destructive focus:ring-destructive' : 'border-border'
            }`}
          />
          {rowError && (
            <span className="text-[10px] text-destructive">
              {t('rowLimitError', { max: MAX_ROWS })}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('anomalyRate')}
          </label>
          <input
            type="number"
            value={anomalyRate}
            onChange={e => onAnomalyRateChange(Number(e.target.value))}
            min={0}
            max={0.5}
            step={0.01}
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-[10px] text-muted-foreground/50">
            {Math.round(anomalyRate * 100)}% of rows will be corrupted
          </span>
        </div>

      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onGenerate}
          disabled={isLoading || rowError || selectedAnomalies.size === 0}
          className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? t('generating') : t('generate')}
        </button>
        <span className="text-xs text-muted-foreground">
          seed= <span className="font-mono">{seed}</span>
        </span>
        <button
          onClick={() => onSeedChange(Math.floor(Math.random() * 1000))}
          className="text-[13px] text-muted-foreground/50 hover:text-foreground transition-colors"
          title="Randomize seed"
        >
          ↺
        </button>
      </div>
    </div>
  )
}