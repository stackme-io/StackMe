import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GenerateControls } from './GenerateControls'
import { ResultBar } from './ResultBar'
import { AnomalyTable } from './AnomalyTable'
import { RowInspect } from './RowInspect'
import type { AnomalyType, AnomalyInfo, GenerateResponse } from './types'
import { csvToJson } from './types'
import type { ParsedField } from './SchemaSection'

const MAX_ROWS = 1000

interface GenerateSectionProps {
  selectedAnomalies: Set<AnomalyType>
  seed: number
  rows: number
  anomalyRate: number
  onSeedChange: (v: number) => void
  onRowsChange: (v: number) => void
  onAnomalyRateChange: (v: number) => void
  onGenerated: () => void
  schemaFields?: ParsedField[]
}

export function GenerateSection({
  selectedAnomalies,
  seed, rows, anomalyRate,
  onSeedChange, onRowsChange, onAnomalyRateChange,
  schemaFields = [],
}: GenerateSectionProps) {
  const { t } = useTranslation('forge-me')
  const [format, setFormat]                   = useState('JSON')
  const [isLoading, setIsLoading]             = useState(false)
  const [tableData, setTableData]             = useState<Record<string, unknown>[]>([])
  const [anomalies, setAnomalies]             = useState<AnomalyInfo[]>([])
  const [viewFilter, setViewFilter]           = useState<'all' | 'anomalies'>('all')
  const [copied, setCopied]                   = useState(false)
  const [hasGenerated, setHasGenerated]       = useState(false)
  const [inspectorOpen, setInspectorOpen]     = useState(false)
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  const rowError = rows > MAX_ROWS || rows < 1

  const anomalyRowIndices = new Set(anomalies.map(a => a.row_index))

  const displayData = viewFilter === 'anomalies'
    ? tableData.filter((_, i) => anomalyRowIndices.has(i))
    : tableData

  const anomalyCount = anomalyRowIndices.size

  // auto-select first anomaly row after generate
  useEffect(() => {
    if (!hasGenerated) return
    if (anomalies.length > 0) {
      const firstAnomalyRowIndex = anomalies[0].row_index
      setSelectedRowIndex(firstAnomalyRowIndex)
      setInspectorOpen(true)
      // auto-scroll to first anomaly row
      setTimeout(() => {
        if (tableRef.current) {
          const rows = tableRef.current.querySelectorAll('tbody tr')
          const targetRow = rows[firstAnomalyRowIndex] as HTMLElement
          if (targetRow) {
            targetRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }
        }
      }, 50)
    } else {
      setSelectedRowIndex(null)
      setInspectorOpen(true)
    }
  }, [anomalies, hasGenerated])

  const handleGenerate = async () => {
    if (rowError || selectedAnomalies.size === 0) return
    setIsLoading(true)
    try {
      const ANOMALY_MAP: Record<string, string> = {
        nulls:      'missing',
        duplicates: 'duplicate',
        outliers:   'outlier',
      }
      const body: Record<string, unknown> = {
        rows,
        anomaly_types: [...selectedAnomalies].map(a => ANOMALY_MAP[a] ?? a),
        anomaly_rate: anomalyRate,
        seed,
        format: format.toLowerCase(),
      }
      if (schemaFields.length > 0) body.schema = schemaFields

      const res = await fetch('https://stackme-production.up.railway.app/forge-me/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: GenerateResponse = await res.json()
      const parsed = data.format === 'json'
        ? JSON.parse(data.data)
        : csvToJson(data.data)
      setTableData(parsed)
      setAnomalies(data.anomalies ?? [])
      setViewFilter('all')
      setHasGenerated(true)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = () => {
    const content = format === 'JSON'
      ? JSON.stringify(tableData, null, 2)
      : [Object.keys(tableData[0] ?? {}).join(','),
         ...tableData.map(r => Object.values(r).join(','))].join('\n')
    const mime = format === 'JSON' ? 'application/json' : 'text/csv'
    const ext  = format.toLowerCase()
    const blob = new Blob([content], { type: mime })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `forgeme-${seed}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = () => {
    const anomalyTypeMap = new Map(anomalies.map(a => [a.row_index, a.anomaly_type]))
    const source = viewFilter === 'anomalies'
      ? tableData.filter((_, i) => anomalyRowIndices.has(i))
      : tableData
    if (source.length === 0) return
    const keys = Object.keys(source[0])
    const allKeys = [...keys, 'anomaly_type']
    const tsv = [
      allKeys.join('\t'),
      ...source.map((r, i) => {
        const rowIndex = r.id !== undefined ? Number(r.id) - 1 : i
        const anomalyType = anomalyTypeMap.get(rowIndex) ?? ''
        return [...keys.map(k => r[k] ?? ''), anomalyType].join('\t')
      }),
    ].join('\n')
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleRowSelect = (rowIndex: number) => {
    setSelectedRowIndex(prev => prev === rowIndex ? null : rowIndex)
    setInspectorOpen(true)
  }

  // is selected row visible in current filter
  const selectedRowHidden = selectedRowIndex !== null
    && viewFilter === 'anomalies'
    && !anomalyRowIndices.has(selectedRowIndex)

  const selectedRowData = selectedRowIndex !== null && !selectedRowHidden
    ? tableData[selectedRowIndex] ?? null
    : null

  return (
    <div className="flex flex-col gap-4">
      <GenerateControls
        format={format}
        rows={rows}
        anomalyRate={anomalyRate}
        seed={seed}
        isLoading={isLoading}
        rowError={rowError}
        onFormatChange={setFormat}
        onRowsChange={onRowsChange}
        onAnomalyRateChange={onAnomalyRateChange}
        onSeedChange={onSeedChange}
        onGenerate={handleGenerate}
        selectedAnomalies={selectedAnomalies}
        t={t as (key: string, opts?: object) => string}
      />

      {hasGenerated && (
        <>
          <ResultBar
            rows={tableData.length}
            anomalyCount={anomalyCount}
            format={format}
            seed={seed}
            viewFilter={viewFilter}
            onFilterChange={setViewFilter}
            onExport={handleExport}
            onCopy={handleCopy}
            copied={copied}
            t={t as (key: string) => string}
          />
          <div className="flex gap-3" ref={tableRef}>
            <AnomalyTable
              tableData={displayData}
              anomalies={anomalies}
              selectedRowIndex={selectedRowIndex}
              onRowSelect={handleRowSelect}
            />
            {inspectorOpen && (
              <RowInspect
                rowIndex={selectedRowIndex}
                rowData={selectedRowData}
                anomalies={anomalies}
                hiddenByFilter={selectedRowHidden}
                onClose={() => setInspectorOpen(false)}
                onShowAll={() => setViewFilter('all')}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}