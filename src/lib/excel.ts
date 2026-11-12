import type { Campaign, SectorFilter, SystemData } from './data'
import { SECTORS, summarize } from './data'
import type { DashboardSummary } from './reports'

// Loaded only when exporting; ExcelJS is not part of the initial dashboard chunk.
export async function createSummaryWorkbook(campaign: Campaign, sector: SectorFilter, source: SystemData, report?: DashboardSummary) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Municipalidad de La Florida'
  workbook.subject = 'Resumen de regalos de Navidad — datos ficticios'
  workbook.created = new Date()
  workbook.calcProperties.fullCalcOnLoad = true
  const { sectors, totals, weeks } = report ?? summarize(campaign, sector, source)
  const sheet = workbook.addWorksheet('Resumen', { properties: { tabColor: { argb: 'FF125B68' } }, views: [{ showGridLines: false }] })
  sheet.columns = [{ width: 20 }, { width: 18 }, { width: 17 }, { width: 17 }, { width: 17 }, { width: 18 }]
  sheet.getCell('A2').value = 'Regalos de Navidad · La Florida'
  sheet.getCell('A2').font = { name: 'Aptos', size: 18, bold: true, color: { argb: 'FF125B68' } }
  sheet.getCell('A4').value = 'Campaña'
  sheet.getCell('B4').value = Number(campaign)
  sheet.getCell('C4').value = 'Sector'
  sheet.getCell('D4').value = sector === 'todos' ? 'Todos los sectores' : SECTORS.find(s => s.id === sector)!.name
  sheet.getCell('A5').value = 'Fuente: datos ficticios de demostración. No son registros municipales reales.'
  sheet.getCell('A5').font = { name: 'Aptos', size: 10, color: { argb: 'FF73808C' } }
  const headers = ['Sector', 'Niños inscritos', 'Asignados', 'Pendientes', 'Entregados', 'Avance']
  const header = sheet.getRow(7)
  header.values = headers
  styleHeader(header)
  sectors.forEach((s, index) => {
    const rowNo = 8 + index
    const row = sheet.getRow(rowNo)
    row.values = [s.name, s.enrolled, s.assigned, { formula: `C${rowNo}-E${rowNo}`, result: s.pending }, s.delivered, { formula: `IF(C${rowNo}=0,0,E${rowNo}/C${rowNo})`, result: s.progress / 100 }]
    styleData(row, index)
  })
  const last = 7 + sectors.length
  const total = sheet.getRow(last + 1)
  total.getCell(1).value = 'Total'
  for (const column of [2, 3, 4, 5]) {
    const key = ['enrolled', 'assigned', 'pending', 'delivered'][column - 2] as 'enrolled' | 'assigned' | 'pending' | 'delivered'
    const letter = ['B', 'C', 'D', 'E'][column - 2]
    total.getCell(column).value = { formula: `SUM(${letter}8:${letter}${last})`, result: totals[key] }
  }
  total.getCell(6).value = { formula: `IF(C${last + 1}=0,0,E${last + 1}/C${last + 1})`, result: totals.progress / 100 }
  styleData(total, 0)
  total.eachCell(cell => { cell.font = { name: 'Aptos', size: 11, bold: true, color: { argb: 'FF125B68' } }; cell.border = { top: { style: 'thin', color: { argb: 'FF125B68' } } } })
  sheet.autoFilter = { from: 'A7', to: `F${last}` }
  sheet.getCell(`A${last + 4}`).value = 'Pendientes = asignados − entregados. Avance = entregados / asignados.'
  sheet.getCell(`A${last + 5}`).value = 'Cada niño se cuenta una sola vez por campaña.'
  sheet.getCell(`A${last + 4}`).font = sheet.getCell('A5').font
  sheet.getCell(`A${last + 5}`).font = sheet.getCell('A5').font
  sheet.addConditionalFormatting({ ref: `F8:F${last}`, rules: [{ type: 'colorScale', priority: 1, cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 1 }], color: [{ argb: 'FFF8FAFB' }, { argb: 'FFCEE6E6' }] }] })
  sheet.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 1, printArea: `A1:F${last + 5}` }

  const weekly = workbook.addWorksheet('Entregas semanales', { views: [{ showGridLines: false }] })
  weekly.columns = [{ width: 22 }, { width: 22 }]
  weekly.getCell('A2').value = 'Entregas por semana'
  weekly.getCell('A2').font = sheet.getCell('A2').font
  weekly.getCell('A4').value = `Campaña ${campaign}. ${sector === 'todos' ? 'Todos los sectores' : SECTORS.find(s => s.id === sector)!.name}. Datos ficticios.`
  weekly.getRow(6).values = ['Semana de inicio', 'Regalos entregados']
  styleHeader(weekly.getRow(6))
  weeks.forEach((w, index) => {
    const row = weekly.getRow(7 + index)
    row.values = [new Date(`${w.date}T12:00:00Z`), w.delivered]
    styleData(row, index)
    row.getCell(1).numFmt = 'dd/mm/yyyy'
  })
  weekly.getRow(7 + weeks.length).values = ['Total', { formula: `SUM(B7:B${6 + weeks.length})`, result: totals.delivered }]
  weekly.getRow(7 + weeks.length).font = { name: 'Aptos', size: 11, bold: true }
  return workbook

  function styleHeader(row: import('exceljs').Row) {
    row.height = 30
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF125B68' } }
      cell.font = { name: 'Aptos', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    })
  }
  function styleData(row: import('exceljs').Row, index: number) {
    row.height = 25
    row.eachCell((cell, col) => {
      cell.font = { name: 'Aptos', size: 11, color: { argb: 'FF263740' } }
      cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'right' }
      if (index % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F7F8' } }
      if (col > 1) cell.numFmt = col === 6 ? '0.0%' : '#,##0'
    })
  }
}

export async function downloadSummary(campaign: Campaign, sector: SectorFilter, source: SystemData, report?: DashboardSummary) {
  const workbook = await createSummaryWorkbook(campaign, sector, source, report)
  const bytes = await workbook.xlsx.writeBuffer()
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `resumen-navidad-${campaign}-${sector}-demo.xlsx`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
