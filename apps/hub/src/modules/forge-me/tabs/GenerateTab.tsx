import { GenerateSection } from '../GenerateSection'
import { SchemaSection } from '../SchemaSection'
import type { ParsedField } from '../SchemaSection'
import type { AnomalyType, ViewMode } from '../types'

interface GenerateTabProps {
  selected: Set<AnomalyType>
  viewMode: ViewMode
  seed: number
  rows: number
  anomalyRate: number
  ratePreview: { type: AnomalyType; count: number }[]
  schemaFields: ParsedField[]
  onSeedChange: (v: number) => void
  onRowsChange: (v: number) => void
  onAnomalyRateChange: (v: number) => void
  onSchemaReady: (fields: ParsedField[]) => void
}

export function GenerateTab({
  selected, viewMode, seed, rows, anomalyRate,
  ratePreview, schemaFields,
  onSeedChange, onRowsChange, onAnomalyRateChange, onSchemaReady,
}: GenerateTabProps) {


  return (
    <>
      {ratePreview.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {ratePreview.map(r => (
            <span
              key={r.type}
              className="text-[10px] px-2 py-0.5 rounded border border-border bg-muted/30 text-muted-foreground"
            >
              {r.count} {r.type}
            </span>
          ))}
        </div>
      )}

      {viewMode === 'raw' ? (
        <GenerateSection
          selectedAnomalies={selected}
          seed={seed}
          rows={rows}
          anomalyRate={anomalyRate}
          onSeedChange={onSeedChange}
          onRowsChange={onRowsChange}
          onAnomalyRateChange={onAnomalyRateChange}
          onGenerated={() => {}}
        />
      ) : (
        <>
          <SchemaSection onSchemaReady={onSchemaReady} />
          <GenerateSection
            selectedAnomalies={selected}
            seed={seed}
            rows={rows}
            anomalyRate={anomalyRate}
            onSeedChange={onSeedChange}
            onRowsChange={onRowsChange}
            onAnomalyRateChange={onAnomalyRateChange}
            onGenerated={() => {}}
            schemaFields={schemaFields}
          />
        </>
      )}
    </>
  )
}