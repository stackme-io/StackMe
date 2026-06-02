import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

export interface ParsedField {
  name: string
  type: 'int' | 'float' | 'timestamp' | 'string'
}

function inferType(value: string): ParsedField['type'] {
  const v = value.trim()
  if (v === '') return 'string'
  if (!isNaN(Number(v))) return v.includes('.') ? 'float' : 'int'
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return 'timestamp'
  return 'string'
}

function normalize(text: string): string {
  const withNewlines = text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  // detect semicolon separator and replace with comma
  const lines = withNewlines.split('\n').filter(l => l.trim() !== '')
  if (lines.length > 0 && lines[0].includes(';') && !lines[0].includes(',')) {
    return withNewlines.replace(/;/g, ',')
  }
  return withNewlines
}

function parseFields(raw: string): ParsedField[] {
  const lines = normalize(raw).split('\n').map(l => l.trim()).filter(l => l !== '')
  if (lines.length === 0) return []
  const headers = lines[0].replace(/^"|"$/g, '').split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const sample  = lines[1] ? lines[1].split(',').map(v => v.trim().replace(/^"|"$/g, '')) : []
  return headers.filter(h => h !== '').map((name, i) => ({
    name,
    type: inferType(sample[i] ?? ''),
  }))
}

const TYPE_STYLES: Record<string, string> = {
  int:       'text-blue-400 bg-blue-950/40',
  float:     'text-amber-400 bg-amber-950/40',
  timestamp: 'text-purple-400 bg-purple-950/40',
  string:    'text-green-400 bg-green-950/40',
}

interface SchemaSectionProps {
  onSchemaReady: (fields: ParsedField[]) => void
}

export function SchemaSection({ onSchemaReady }: SchemaSectionProps) {
  const { t } = useTranslation('forge-me')
  const [tab, setTab]           = useState<'paste' | 'upload'>('paste')
  const [raw, setRaw]           = useState('')
  const [fields, setFields]     = useState<ParsedField[]>([])
  const [fileName, setFileName] = useState<string | null>(null)

  const process = useCallback((text: string) => {
    const normalized = normalize(text)
    const firstThree = normalized.split('\n').filter(l => l.trim() !== '').slice(0, 3).join('\n')
    const parsed = parseFields(firstThree)
    setFields(parsed)
    onSchemaReady(parsed)
  }, [onSchemaReady])

  const handleTextChange = useCallback((val: string) => {
    setRaw(val)
    if (!val.trim()) { setFields([]); return }
    process(val)
  }, [process])

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) return
    setFileName(file.name)
    const text = await file.text()
    process(text)
  }, [process])

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-muted/10 mb-5">

      <div className="flex gap-1">
        {(['paste', 'upload'] as const).map(tabId => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={`px-3 py-1 rounded-md text-xs border transition-colors ${
              tab === tabId
                ? 'border-primary/50 bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:bg-muted/30'
            }`}
          >
            {tabId === 'paste' ? t('pasteSample') : t('uploadFile')}
          </button>
        ))}
      </div>

      {tab === 'paste' && (
        <textarea
          value={raw}
          onChange={e => handleTextChange(e.target.value)}
          placeholder={'user_id,created_at,amount,status\n1001,2024-01-01,99.90,active\n1002,2024-01-02,149.00,trial'}
          className="w-full h-[88px] px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-mono resize-none placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}

      {tab === 'upload' && (
        <label className="flex flex-col items-center justify-center gap-1.5 h-[88px] px-4 rounded-lg border-2 border-dashed border-border bg-background cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors">
          <span className="text-xs text-muted-foreground">
            {fileName ?? t('uploadClick')}
          </span>
          <span className="text-[10px] text-muted-foreground/80">{t('uploadHint')}</span>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
        </label>
      )}

      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
        <span className="text-[10px] text-muted-foreground/95">
          {t('privacyNote')}
        </span>
      </div>

      {fields.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {t('detectedSchema', { count: fields.length })}
          </p>
          <div className="flex flex-wrap gap-1">
            {fields.map(f => (
              <span
                key={f.name}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${TYPE_STYLES[f.type]}`}
              >
                {f.name} <span className="opacity-50">{f.type}</span>
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}