import type { AnomalyInfo } from './types'

interface AnomalyTableProps {
  tableData: any[]
  anomalies: AnomalyInfo[]
  isTimestamp?: (col: string) => boolean
}

export function AnomalyTable({ tableData, anomalies, isTimestamp }: AnomalyTableProps) {
  if (tableData.length === 0) return null

  const columns = Object.keys(tableData[0])

  const anomalyByCol = new Map<number, string[]>()
  anomalies.forEach(a => {
    const existing = anomalyByCol.get(a.row_index) ?? []
    anomalyByCol.set(a.row_index, [...existing, a.column])
  })

  return (
    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
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
          {tableData.map((row, i) => {
            const rowIndex = row.id !== undefined ? Number(row.id) - 1 : i
            const anomalyCols = new Set(anomalyByCol.get(rowIndex) ?? [])
            const isAnomaly = anomalyCols.size > 0

            return (
              <tr
                key={i}
                style={{
                  background: isAnomaly
                    ? '#fef9c3'
                    : i % 2 === 0 ? '#fff' : '#f9fafb',
                }}
              >
                {columns.map(col => (
                  <td key={col} style={{
                    padding: '8px 12px',
                    color: anomalyCols.has(col) ? '#b45309' : '#111827',
                    fontWeight: anomalyCols.has(col) ? 600 : 400,
                    borderBottom: '1px solid #f3f4f6',
                    whiteSpace: 'nowrap',
                    background: anomalyCols.has(col) ? '#fef3c7' : 'transparent',
                  }}>
                    {row[col] === null || row[col] === undefined
                      ? <span style={{ color: '#ef4444', fontWeight: 600 }}>NULL</span>
                      : isTimestamp?.(col)
                        ? new Date(Number(row[col])).toISOString().replace('T', ' ').slice(0, 19)
                        : String(row[col])}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
