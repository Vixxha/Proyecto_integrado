import assert from 'node:assert/strict'
import { CAMPAIGNS, DEMO_DATA, SECTORS, summarize } from '../src/lib/data.ts'

let checks = 0
for (const campaign of CAMPAIGNS) {
  for (const filter of ['todos', ...SECTORS.map(s => s.id)]) {
    const { totals, sectors, weeks } = summarize(campaign, filter)
    assert.equal(totals.pending, totals.assigned - totals.delivered)
    assert.equal(weeks.reduce((sum, w) => sum + w.delivered, 0), totals.delivered)
    for (const key of ['enrolled', 'assigned', 'delivered', 'pending']) {
      assert.equal(sectors.reduce((sum, sector) => sum + sector[key], 0), totals[key])
    }
    checks += 6
  }
}
assert.deepEqual(summarize('2026').totals, {
  enrolled: 12840, assigned: 11520, delivered: 8340, pending: 3180, progress: 8340 / 11520 * 100,
})
assert.ok(DEMO_DATA.registrations.filter(r => r.campaign === '2026').length > 12840)
assert.equal(summarize('2025').totals.pending, 2575)
assert.equal(summarize('2026', 'todos', { registrations: [], gifts: [] }).totals.progress, 0)
console.log(`${checks + 4} verificaciones de datos correctas: campañas, sectores, duplicados, pendientes y entregas semanales.`)
