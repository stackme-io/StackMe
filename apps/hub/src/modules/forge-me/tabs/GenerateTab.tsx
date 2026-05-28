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
          {/* full schema section */}
          <div className={`grid transition-all duration-200 ${schemaCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
            <div className="overflow-hidden">
              <SchemaSection onSchemaReady={onSchemaReady} />
            </div>
          </div>

          {/* collapsed schema bar */}
          <div className={`grid transition-all duration-200 ${schemaCollapsed ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-border bg-muted/10 mb-5 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSchemaCollapsed(false)}>
                <span className="text-xs text-muted-foreground/70">
                  {schemaFields.length} columns detected
                </span>
                <button
                  onClick={() => setSchemaCollapsed(false)}
                  className="ml-auto flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  <i className="ti ti-pencil text-[11px]" />
                  Edit
                </button>
              </div>
            </div>
          </div>

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