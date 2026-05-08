import { describe, it, expect } from 'vitest'
import { csvToJson } from '../types'

describe('csvToJson', () => {
  it('parses basic CSV correctly', () => {
    const csv = 'name,age\nalice,30\nbob,25'
    const result = csvToJson(csv)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ name: 'alice', age: '30' })
    expect(result[1]).toEqual({ name: 'bob', age: '25' })
  })

  it('handles empty CSV', () => {
    expect(csvToJson('')).toEqual([])
  })

  it('handles header-only CSV', () => {
    expect(csvToJson('name,age')).toEqual([])
  })

  it('trims whitespace from headers and values', () => {
    const csv = ' name , age \n alice , 30 '
    const result = csvToJson(csv)
    expect(result[0]).toEqual({ name: 'alice', age: '30' })
  })

  it('fills missing values with empty string', () => {
    const csv = 'a,b,c\n1,2'
    const result = csvToJson(csv)
    expect(result[0].c).toBe('')
  })

  it('handles single column', () => {
    const csv = 'value\n42\n99'
    const result = csvToJson(csv)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ value: '42' })
  })

  it('handles multiple rows', () => {
    const csv = 'id,name\n1,alice\n2,bob\n3,charlie'
    expect(csvToJson(csv)).toHaveLength(3)
  })
})