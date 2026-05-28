import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GenerateControls } from './GenerateControls'
import { DataSection } from './DataSection'
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
  onGenerated,
  schemaFields = [],
}: GenerateSectionProps) {
  const { t } = useTranslation('forge-me')
  const [format, setFormat]                     = useState('JSON')
  const [isLoading, setIsLoading]               = useState(false)
  const [tableData, setTableData]               = useState<Record<string, unknown>[]>([])
  const [anomalies, setAnomalies]               = useState<AnomalyInfo[]>([])
  const [viewFilter, setViewFilter]             = useState<'all' | 'anomalies'>('all')
  const [copied, setCopied]                     = useState(false)
  const [exported, setExported]                 = useState(false)
  const [hasGenerated, setHasGenerated]         = useState(false)
  const [collapsed, setCollapsed]               = useState(false)
  const [inspectorOpen, setInspectorOpen]       = useState(false)
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  const rowError          = rows > MAX_ROWS || rows < 1
  const anomalyRowIndices = new Set(anomalies.map(a => a.row_index))
  const indexedData       = tableData.map((row, i) => ({ ...row, _idx: i }))
  const displayData       = viewFilter === 'anomalies'
    ? indexedData.filter(row => anomalyRowIndices.has(row._idx as number))
    : indexedData
  const anomalyCount      = anomalyRowIndices.size
  const total             = Math.round(rows * anomalyRate)
  const breakdown         = [...selectedAnomalies].join(' · ')

  const selectedRowHidden = selectedRowIndex !== null
    && viewFilter === 'anomalies'
    && !anomalyRowIndices.has(selectedRowIndex)

  const selectedRowData = selectedRowIndex !== null && !selectedRowHidden
    ? tableData[selectedRowIndex] ?? null
    : null

  useEffect(() => {
    if (!hasGenerated) return
    if (anomalies.length > 0) {
      const firstIdx = anomalies[0].row_index
      setSelectedRowIndex(firstIdx)
      setInspectorOpen(true)
      setTimeout(() => {
        const rows = tableRef.current?.querySelectorAll('tbody tr')
        const target = rows?.[firstIdx] as HTMLElement | undefined
        target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
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
        nulls: 'missing', duplicates: 'duplicate', outliers: 'outlier',
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
      const parsed = data.format === 'json' ? JSON.parse(data.data) : csvToJson(data.data)
      setTableData(parsed)
      setAnomalies(data.anomalies ?? [])
      setViewFilter('all')
      setHasGenerated(true)
      setCollapsed(true)
      onGenerated()
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
    const blob = new Blob([content], { type: format === 'JSON' ? 'application/json' : 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `forgeme-${seed}.${format.toLowerCase()}`,
    })
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2000)
  }

  const handleCopy = () => {
    const anomalyTypeMap = new Map(anomalies.map(a => [a.row_index, a.anomaly_type]))
    const sourceWithIndex = viewFilter === 'anomalies'
      ? tableData.map((row, i) => ({ row, idx: i })).filter(({ idx }) => anomalyRowIndices.has(idx))
      : tableData.map((row, i) => ({ row, idx: i }))
    if (sourceWithIndex.length === 0) return
    const keys = Object.keys(sourceWithIndex[0].row)
    const tsv = [
      [...keys, 'anomaly_type'].join('\t'),
      ...sourceWithIndex.map(({ row, idx }) =>
        [...keys.map(k => row[k] ?? ''), anomalyTypeMap.get(idx) ?? ''].join('\t')
      ),
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

  return (
    <div className="flex flex-col gap-4">

      <div className={`grid transition-all duration-200 ${collapsed ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="flex items-center gap-2 bg-muted/20 rounded-xl px-4 py-1.5 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setCollapsed(false)}>
            <span className="text-xs text-muted-foreground/70 font-mono">{format}</span>
            <span className="text-muted-foreground/30 text-sm">·</span>
            <span className="text-xs text-muted-foreground/70">{rows} rows</span>
            <span className="text-muted-foreground/30 text-sm">·</span>
            <span className="text-xs text-muted-foreground/70 font-mono">seed {seed}</span>
            <span className="text-muted-foreground/30 text-sm">·</span>
            <span className="text-xs text-muted-foreground/70">≈ {total} corrupted rows: {breakdown}</span>
            <button
              onClick={() => setCollapsed(false)}
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <i className="ti ti-pencil text-[11px]" />
              Edit
            </button>
          </div>
        </div>
      </div>

      <div className={`grid transition-all duration-200 ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
        <div className="overflow-hidden">
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
        </div>
      </div>

      {hasGenerated && (
        <DataSection
          displayData={displayData}
          anomalies={anomalies}
          totalRows={tableData.length}
          anomalyCount={anomalyCount}
          format={format}
          seed={seed}
          viewFilter={viewFilter}
          copied={copied}
          exported={exported}
          selectedRowIndex={selectedRowIndex}
          selectedRowData={selectedRowData}
          selectedRowHidden={selectedRowHidden}
          inspectorOpen={inspectorOpen}
          tableRef={tableRef}
          onFilterChange={setViewFilter}
          onCopy={handleCopy}
          onExport={handleExport}
          onRowSelect={handleRowSelect}
          onInspectorClose={() => setInspectorOpen(false)}
          onShowAll={() => setViewFilter('all')}
          t={t as (key: string) => string}
        />
      )}
    </div>
  )
}