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
  const total     = Math.round(rows * anomalyRate)
  const breakdown = [...selectedAnomalies].join(' · ')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-6 items-start">

        <div className="flex flex-col gap-1.5 w-[180px]">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('format')}
          </label>
          <select
            value={format}
            onChange={e => onFormatChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring appearance-none w-full"
          >
            <option value="JSON">JSON</option>
            <option value="CSV">CSV</option>
          </select>
          <div className="h-4" />
        </div>

        <div className="flex flex-col gap-1.5 w-[180px]">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center justify-between">
            {t('rowCount')}
            <span className="text-[10px] normal-case tracking-normal font-normal text-muted-foreground/75">
              {t('rowLimitHint', { max: MAX_ROWS })}
            </span>
          </label>
          <input
            type="number"
            value={rows}
            onChange={e => onRowsChange(Number(e.target.value))}
            min={1}
            max={MAX_ROWS}
            className={`px-3 py-1.5 rounded-lg border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring ${
              rowError ? 'border-destructive focus:ring-destructive' : 'border-border'
            }`}
          />
          <div className="h-4 flex items-center">
            {rowError && (
              <span className="text-[10px] text-destructive">
                {t('rowLimitError', { max: MAX_ROWS })}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('anomalyRate')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={anomalyRate}
              onChange={e => onAnomalyRateChange(Number(e.target.value))}
              min={0}
              max={0.5}
              step={0.01}
              className="w-[180px] px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {selectedAnomalies.size > 0 && !rowError && anomalyRate > 0 && (
              <p className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                ≈ {total} corrupted rows: {breakdown}
              </p>
            )}
          </div>
          <div className="h-4" />
        </div>

      </div>

      <div className="flex items-center gap-3 bg-muted/20 rounded-xl px-4 py-3">
        <button
          onClick={onGenerate}
          disabled={isLoading || rowError || selectedAnomalies.size === 0}
          className="px-8 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? t('generating') : t('generateBtn')}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">seed=</span>
          <input
            type="number"
            value={seed}
            onChange={e => {
              const v = Math.floor(Number(e.target.value))
              if (v >= 0 && v <= 99999) onSeedChange(v)
            }}
            min={0}
            max={99999}
            step={1}
            className="w-16 px-1.5 py-0.5 rounded border border-border bg-background text-foreground text-xs font-mono text-right focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={() => onSeedChange(Math.floor(Math.random() * 99999))}
            className="text-[13px] text-muted-foreground/50 hover:text-foreground transition-colors"
            title={t('randomizeSeed')}
          >
            ↺
          </button>
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground/40">
          {t('deterministicNote')}
        </span>
      </div>
    </div>
  )
}