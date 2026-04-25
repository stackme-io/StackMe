import { useState } from 'react'
import apiClient from '../../api/client'
import { loadJSON, runQuery } from '../../shared/analytics'

type DataFormat = 'json' | 'csv' | 'sql'

interface AnomalyInfo {
  row_index: number
  column: string
  anomaly_type: string
  original_value: string | null
  description: string
}

interface GenerateResponse {
  format: DataFormat
  rows_total: number
  anomalies_count: number
  anomalies: AnomalyInfo[]
  data: string
}

const inputStyle = {
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '14px',
  background: '#fff',
  color: '#111827',
}

export default function ForgeMePage() {
  const [prompt, setPrompt] = useState('')
  const [format, setFormat] = useState<DataFormat>('json')
  const [rows, setRows] = useState(100)
  const [anomalyRate, setAnomalyRate] = useState(0.05)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [tableData, setTableData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

    const handleSubmit = async () => {
      setLoading(true)
      setError(null)
      setResult(null)
      setTableData([])

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
          const data = await runQuery('SELECT * FROM sensor_data')
          console.log('timestamp raw value:', data[0].timestamp, typeof data[0].timestamp)
          setTableData(data)
        }

      } catch (err) {
        setError('Ошибка при запросе к API. Проверь что бэкенд запущен.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

  const columns = tableData.length > 0 ? Object.keys(tableData[0]) : []

  return (
    <div style={{ maxWidth: '960px' }}>
      <h1 style={{ marginBottom: '8px' }}>ForgeMe</h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        Генератор и анализатор аномалий в данных
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: 500 }}>Описание датасета</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Например: датасет показаний температурных датчиков на производстве за месяц"
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            <label style={{ fontWeight: 500 }}>Формат</label>
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
            <label style={{ fontWeight: 500 }}>Количество строк</label>
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
            <label style={{ fontWeight: 500 }}>Доля аномалий</label>
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
          {loading ? 'Генерация...' : 'Сгенерировать'}
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
            <span>Строк: <strong>{result.rows_total}</strong></span>
            <span>Аномалий: <strong>{result.anomalies_count}</strong></span>
            <span>Формат: <strong>{result.format.toUpperCase()}</strong></span>
          </div>
        )}

        {tableData.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 500 }}>
              Данные из DuckDB ({tableData.length} строк)
            </label>
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
              }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {columns.map(col => (
                      <th key={col} style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
                        borderBottom: '1px solid #e5e7eb',
                        whiteSpace: 'nowrap',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr
                      key={i}
                      style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}
                    >
                      {columns.map(col => (
                        <td key={col} style={{
                          padding: '8px 12px',
                          color: '#111827',
                          borderBottom: '1px solid #f3f4f6',
                          whiteSpace: 'nowrap',
                        }}>
                         {row[col] === null || row[col] === undefined
                          ? <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>null</span>
                          : col === 'timestamp'
                            ? new Date(Number(row[col])).toISOString().replace('T', ' ').slice(0, 19)
                            : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}