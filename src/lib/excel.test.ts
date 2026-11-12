import { describe, expect, it } from 'vitest'
import { createSummaryWorkbook } from './excel'
import { DEMO_DATA, summarize } from './data'

describe('Excel summary', () => {
  it('exports filtered numeric data, formulas and matching weekly totals', async () => {
    const workbook = await createSummaryWorkbook('2026', 'sur', DEMO_DATA)
    const sheet = workbook.getWorksheet('Resumen')!
    expect(sheet.getCell('A8').value).toBe('Sur')
    expect(sheet.getCell('B8').value).toBe(2640)
    expect(sheet.getCell('C8').value).toBe(2380)
    expect(sheet.getCell('D8').value).toEqual({ formula: 'C8-E8', result: 790 })
    expect(sheet.getCell('F8').numFmt).toBe('0.0%')
    expect(sheet.getCell('F8').formula).toBe('IF(C8=0,0,E8/C8)')
    expect(sheet.getCell('F8').result).toBeCloseTo(1590 / 2380, 12)
    const weekly = workbook.getWorksheet('Entregas semanales')!
    const summary = summarize('2026', 'sur')
    expect(weekly.getCell('B13').value).toEqual({ formula: 'SUM(B7:B12)', result: summary.totals.delivered })
    const bytes = await workbook.xlsx.writeBuffer()
    const { default: ExcelJS } = await import('exceljs')
    const reopened = new ExcelJS.Workbook()
    await reopened.xlsx.load(bytes)
    expect(reopened.getWorksheet('Resumen')!.getCell('D8').result).toBe(790)
    expect(reopened.worksheets).toHaveLength(2)
  })
})
