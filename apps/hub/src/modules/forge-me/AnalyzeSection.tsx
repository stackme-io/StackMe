import { useState, useRef, useCallback } from 'react'
import apiClient from '../../api/client'
import { loadJSON, runQuery, loadAnomalyIndex } from '../../shared/analytics'
import { AnomalyTable } from './AnomalyTable'
import type { AnalyzeResponse } from './types'
import { csvToJson } from './types'

export function AnalyzeSection() {
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [analyzeTableData, setAnalyzeTableData] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAnalyze = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setAnalyzeError('Only CSV files are supported')
      return
    }

    setAnalyzeLoading(true)
    setAnalyzeError(null)
    setAnalyzeResult(null)
    setAnalyzeTableData([])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiClient.post<AnalyzeResponse>(
        '/forge-me/analyze',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setAnalyzeResult(response.data)

      const text = await file.text()
      await loadJSON(JSON.stringify(csvToJson(text)), 'analyze_data')
      await loadAnomalyIndex(response.data.anomalies.map(a => a.row_index))
      const data = await runQuery('SELECT * FROM analyze_data')
      setAnalyzeTableData(data)

    } catch (err) {
      setAnalyzeError('Failed to analyze file. Make sure it is a valid CSV.')
      console.error(err)
    } finally {
      setAnalyzeLoading(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleAnalyze(file)
  }, [handleAnalyze])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '32px', marginTop: '12px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
        Analyze your own dataset
      </h2>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
        Upload a CSV file to detect anomalies using IQR method
      </p>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? '#5B4FCF' : '#d1d5db'}`,
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragOver ? '#f5f3ff' : '#fafafa',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
        <p style={{ fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
          {analyzeLoading ? 'Analyzing...' : 'Drop CSV file here or click to upload'}
        </p>
        <p style={{ fontSize: '13px', color: '#9ca3af' }}>
          Supports CSV files only
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleAnalyze(file)
          }}
        />
      </div>

      {analyzeError && (
        <div style={{
          marginTop: '12px',
          padding: '12px 16px',
          borderRadius: '6px',
          background: '#fef2f2',
          color: '#dc2626',
          fontSize: '14px',
        }}>
          {analyzeError}
        </div>
      )}

      {analyzeResult && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            display: 'flex',
            gap: '16px',
            padding: '16px',
            borderRadius: '8px',
            background: '#f0fdf4',
            fontSize: '14px',
          }}>
            <span>Rows: <strong>{analyzeResult.rows_total}</strong></span>
            <span>Anomalies found: <strong>{analyzeResult.anomalies_count}</strong></span>
          </div>

          <AnomalyTable
            tableData={analyzeTableData}
            anomalies={analyzeResult.anomalies}
          />

          {analyzeResult.anomalies.map((a, i) => (
            <div key={i} style={{
              padding: '10px 14px',
              borderRadius: '6px',
              background: '#fef9c3',
              fontSize: '13px',
              borderLeft: '3px solid #eab308',
            }}>
              <strong>Row {a.row_index}</strong> · {a.column} · {a.anomaly_type}
              <br />
              {a.description}
              {a.original_value && (
                <span style={{ color: '#6b7280' }}> (value: {a.original_value})</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
