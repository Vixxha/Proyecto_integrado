import { describe, expect, it } from 'vitest'
import { CAMPAIGNS, SECTORS, summarize } from './data'
import { reportSummary, type CampaignReport } from './reports'

describe('compact SQL dashboard results', () => {
  for (const campaign of CAMPAIGNS) {
    it(`matches every original indicator, sector and week for ${campaign}`, () => {
      const report: CampaignReport = {
        sectors: summarize(campaign).allSectors.map(({ progress: _progress, ...sector }) => sector),
        deliveries: SECTORS.flatMap(sector => summarize(campaign,sector.id).weeks.filter(w => w.delivered > 0).map(w => ({ sector: sector.id, date: w.date, delivered: w.delivered }))),
      }
      for (const filter of ['todos', ...SECTORS.map(s => s.id)] as const) {
        expect(reportSummary(report,campaign,filter)).toEqual(summarize(campaign,filter))
      }
    })
  }
  it('keeps empty campaigns and zero-denominator progress valid', () => {
    const report: CampaignReport = { sectors: SECTORS.map(s => ({ id:s.id,name:s.name,enrolled:0,assigned:0,delivered:0,pending:0 })),deliveries:[] }
    const summary = reportSummary(report,'2026','todos')
    expect(summary.totals.progress).toBe(0)
    expect(summary.weeks).toHaveLength(6)
    expect(summary.weeks.every(w => w.delivered === 0)).toBe(true)
  })
})
