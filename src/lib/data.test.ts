import { describe, expect, it } from 'vitest'
import { CAMPAIGNS, DEMO_DATA, SECTORS, summarize } from './data'

describe('campaign summaries from a single normalized source', () => {
  it('counts each child once despite duplicated registrations', () => {
    const summary = summarize('2026')
    expect(DEMO_DATA.registrations.filter(r => r.campaign === '2026').length).toBeGreaterThan(12840)
    expect(summary.totals.enrolled).toBe(12840)
  })
  it('keeps totals, sectors and weekly deliveries consistent for every filter', () => {
    for (const campaign of CAMPAIGNS) {
      for (const sector of ['todos', ...SECTORS.map(s => s.id)] as const) {
        const { totals, sectors, weeks } = summarize(campaign, sector)
        expect(totals.pending).toBe(totals.assigned - totals.delivered)
        expect(weeks.reduce((sum, w) => sum + w.delivered, 0)).toBe(totals.delivered)
        for (const key of ['enrolled', 'assigned', 'delivered', 'pending'] as const) {
          expect(sectors.reduce((sum, s) => sum + s[key], 0)).toBe(totals[key])
        }
        expect(totals.progress).toBe(totals.delivered / totals.assigned * 100)
      }
    }
  })
  it('does not count unassigned children as pending gifts', () => {
    const { totals } = summarize('2026')
    expect(totals).toMatchObject({ enrolled: 12840, assigned: 11520, delivered: 8340, pending: 3180 })
    expect(totals.pending).not.toBe(totals.enrolled - totals.delivered)
  })
  it('handles a campaign without registrations or gifts', () => {
    const { totals, weeks } = summarize('2026', 'todos', { registrations: [], gifts: [] })
    expect(totals).toEqual({ enrolled: 0, assigned: 0, delivered: 0, pending: 0, progress: 0 })
    expect(weeks.every(w => w.delivered === 0)).toBe(true)
  })
})
