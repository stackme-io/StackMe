import { useState } from 'react'
import apiClient from '../../api/client'
import { loadJSON, runQuery, loadAnomalyIndex } from '../../shared/analytics'
import { AnomalyTable } from './AnomalyTable'
import type { DataFormat, FilterMode, GenerateResponse } from './types'
import { inputStyle } from './types'

export function GenerateSection() {
  const [prompt, setPrompt] = useState('')
  const [format, setFormat] = useState<DataFormat>('json')
  const [rows, setRows] = useState(100)
  const [anomalyRate, setAnomalyRate] = useState(0.05)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [tableData, setTableData] = useState<any[]>([])
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [loading, setLoading] = useState(false)
  const [filterLoading, setFilterLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setTableData([])
    setFilterMode('all')

    try {
      const response = await apiClient.post<GenerateResponse>('/forge-me/generate', {
        prompt,
        format,
        rows,
        anomaly_rate: anomalyRate,
      })
      setResult(response.data)

      if (format === 'json') {
        await loadJSON(response.data.data, 'sensor_data')
        await loadAnomalyIndex(response.data.anomalies.map(a => a.row_index))
        const data = await runQuery('SELECT * FROM sensor_data')
        setTableData(data)
      }
    } catch (err) {
      setError('Failed to connect to API. Make sure the backend is running.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = async (mode: FilterMode) => {
    if (!result) return
    setFilterLoading(true)
    setFilterMode(mode)

    try {
      if (mode === 'all') {
        const data = await runQuery('SELECT * FROM sensor_data')
        setTableData(data)
      } else {
        const data = await runQuery(`
          SELECT s.* FROM sensor_data s
          INNER JOIN anomaly_index a ON s.id - 1 = a.row_index
        `)
        setTableData(data)
      }
    } finally {
      setFilterLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontWeight: 500 }}>Dataset description</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. temperature sensor readings from a manufacturing plant over one month"
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <label style={{ fontWeight: 500 }}>Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as DataFormat)}
            style={inputStyle}
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="sql">SQL</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <label style={{ fontWeight: 500 }}>Row count</label>
          <input
            type="number"
            value={rows}
            onChange={(e) => setRows(Number(e.target.value))}
            min={10}
            max={10000}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <label style={{ fontWeight: 500 }}>Anomaly rate</label>
          <input
            type="number"
            value={anomalyRate}
            onChange={(e) => setAnomalyRate(Number(e.target.value))}
            min={0}
            max={0.5}
            step={0.01}
            style={inputStyle}
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || prompt.length < 10}
        style={{
          padding: '12px 24px',
          borderRadius: '6px',
          border: 'none',
          background: loading || prompt.length < 10 ? '#a5b4fc' : '#5B4FCF',
          color: '#fff',
          fontSize: '15px',
          fontWeight: 600,
          cursor: loading || prompt.length < 10 ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        {loading ? 'Generating...' : 'Generate'}
      </button>

      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '6px',
          background: '#fef2f2',
          color: '#dc2626',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{
          display: 'flex',
          gap: '16px',
          padding: '16px',
          borderRadius: '8px',
          background: '#f0fdf4',
          fontSize: '14px',
        }}>
          <span>Rows: <strong>{result.rows_total}</strong></span>
          <span>Anomalies: <strong>{result.anomalies_count}</strong></span>
          <span>Format: <strong>{result.format.toUpperCase()}</strong></span>
        </div>
      )}

      {tableData.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontWeight: 500 }}>
              Data from DuckDB ({tableData.length} rows)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['all', 'anomalies'] as FilterMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => handleFilter(mode)}
                  disabled={filterLoading}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderColor: filterMode === mode ? '#5B4FCF' : '#d1d5db',
                    background: filterMode === mode ? '#5B4FCF' : '#fff',
                    color: filterMode === mode ? '#fff' : '#374151',
                  }}
                >
                  {mode === 'all' ? 'All rows' : '⚠ Anomalies only'}
                </button>
              ))}
            </div>
          </div>

          <AnomalyTable
            tableData={tableData}
            anomalies={result?.anomalies ?? []}
            isTimestamp={(col) => col === 'timestamp'}
          />
        </div>
      )}
    </div>
  )
}
