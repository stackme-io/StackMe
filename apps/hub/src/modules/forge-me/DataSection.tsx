import type React from 'react'
import { ResultBar } from './ResultBar'
import { AnomalyTable } from './AnomalyTable'
import { RowInspect } from './RowInspect'
import type { AnomalyInfo } from './types'

interface DataSectionProps {
  displayData: Record<string, unknown>[]
  anomalies: AnomalyInfo[]
  totalRows: number
  anomalyCount: number
  format: string
  seed: number
  viewFilter: 'all' | 'anomalies'
  copied: boolean
  exported: boolean
  selectedRowIndex: number | null
  selectedRowData: Record<string, unknown> | null
  selectedRowHidden: boolean
  inspectorOpen: boolean
  tableRef: React.RefObject<HTMLDivElement | null>
  onFilterChange: (f: 'all' | 'anomalies') => void
  onCopy: () => void
  onExport: () => void
  onAnalyze?: () => void
  analyzeInstalled?: boolean
  onRowSelect: (index: number) => void
  onInspectorClose: () => void
  onShowAll: () => void
  t: (key: string) => string
}

export function DataSection({
  displayData, anomalies,
  totalRows, anomalyCount, format, seed,
  viewFilter, copied, exported,
  selectedRowIndex, selectedRowData, selectedRowHidden, inspectorOpen,
  tableRef,
  onFilterChange, onCopy, onExport, onAnalyze, analyzeInstalled,
  onRowSelect, onInspectorClose, onShowAll,
  t,
}: DataSectionProps) {
  return (
    <>
      <ResultBar
        rows={totalRows}
        anomalyCount={anomalyCount}
        format={format}
        seed={seed}
        viewFilter={viewFilter}
        onFilterChange={onFilterChange}
        onExport={onExport}
        onCopy={onCopy}
        onAnalyze={onAnalyze}
        analyzeInstalled={analyzeInstalled}
        copied={copied}
        exported={exported}
        t={t}
      />
      <div className="flex gap-3" ref={tableRef}>
        <AnomalyTable
          tableData={displayData}
          anomalies={anomalies}
          selectedRowIndex={selectedRowIndex}
          onRowSelect={onRowSelect}
        />
        {inspectorOpen && (
          <RowInspect
            rowIndex={selectedRowIndex}
            rowData={selectedRowData}
            anomalies={anomalies}
            hiddenByFilter={selectedRowHidden}
            onClose={onInspectorClose}
            onShowAll={onShowAll}
          />
        )}
      </div>
    </>
  )
}