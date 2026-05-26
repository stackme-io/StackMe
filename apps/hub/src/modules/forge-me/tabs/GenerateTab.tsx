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
  schemaFields: ParsedField[]
  onSeedChange: (v: number) => void
  onRowsChange: (v: number) => void
  onAnomalyRateChange: (v: number) => void
  onSchemaReady: (fields: ParsedField[]) => void
}

export function GenerateTab({
  selected, viewMode, seed, rows, anomalyRate,
  schemaFields,
  onSeedChange, onRowsChange, onAnomalyRateChange, onSchemaReady,
}: GenerateTabProps) {
  return (
    <>
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