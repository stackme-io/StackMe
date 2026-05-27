import { useState } from 'react'
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
  const [schemaCollapsed, setSchemaCollapsed] = useState(false)

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
          <div className={schemaCollapsed ? 'hidden' : ''}>
            <SchemaSection onSchemaReady={onSchemaReady} />
          </div>

          {schemaCollapsed && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-muted/10 mb-5">
              <span className="text-xs text-muted-foreground/60">
                {schemaFields.length} columns detected
              </span>
              <button
                onClick={() => setSchemaCollapsed(false)}
                className="ml-auto text-xs text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                Edit
              </button>
            </div>
          )}

          <GenerateSection
            selectedAnomalies={selected}
            seed={seed}
            rows={rows}
            anomalyRate={anomalyRate}
            onSeedChange={onSeedChange}
            onRowsChange={onRowsChange}
            onAnomalyRateChange={onAnomalyRateChange}
            onGenerated={() => setSchemaCollapsed(true)}
            schemaFields={schemaFields}
          />
        </>
      )}
    </>
  )
}