import { describe, it, expect } from 'vitest'

function validateCSV(text: string): string | null {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return 'CSV file must have a header row and at least one data row.'
  const headers = lines[0].split(',').map(h => h.trim()).filter(Boolean)
  if (headers.length === 0) return 'CSV file has no valid column headers.'
  return null
}

function validateJSON(text: string): string | null {
  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) return 'JSON file must contain an array of objects (e.g. [{...}, {...}]).'
    if (parsed.length === 0) return 'JSON array is empty.'
    return null
  } catch {
    return 'Invalid JSON format.'
  }
}

describe('validateCSV', () => {
  it('passes valid CSV', () => {
    expect(validateCSV('name,age\nalice,30')).toBeNull()
  })

  it('fails empty file', () => {
    expect(validateCSV('')).not.toBeNull()
  })

  it('fails header-only CSV', () => {
    expect(validateCSV('name,age')).not.toBeNull()
  })

  it('fails CSV with empty header line', () => {
    expect(validateCSV(',\nalice,30')).not.toBeNull()
  })

  it('fails whitespace-only file', () => {
    expect(validateCSV('   \n  ')).not.toBeNull()
  })
})

describe('validateJSON', () => {
  it('passes valid JSON array', () => {
    expect(validateJSON('[{"a":1}]')).toBeNull()
  })

  it('fails empty array', () => {
    expect(validateJSON('[]')).not.toBeNull()
  })

  it('fails object instead of array', () => {
    expect(validateJSON('{"a":1}')).not.toBeNull()
  })

  it('fails invalid JSON', () => {
    expect(validateJSON('not json')).not.toBeNull()
  })

  it('fails string instead of array', () => {
    expect(validateJSON('"hello"')).not.toBeNull()
  })
})