import assert from 'node:assert/strict'
import { registerChild, assignGift, deliverGift } from '../src/lib/operations.ts'
import { summarize } from '../src/lib/data.ts'

const child = { campaign: '2026', childId: 'DEMO-CHECK-001', sector: 'centro', name: 'Niña ficticia', birthDate: '2019-04-12', guardian: 'Apoderada ficticia' }
const registered = registerChild({ registrations: [], gifts: [] }, child)
assert.throws(() => registerChild(registered, child), /ya está inscrito/)
const assigned = assignGift(registered, '2026', child.childId, 'Set de arte')
assert.throws(() => assignGift(assigned, '2026', child.childId, 'Pelota'), /ya tiene/)
assert.deepEqual(summarize('2026', 'todos', assigned).totals, { enrolled: 1, assigned: 1, delivered: 0, pending: 1, progress: 0 })
assert.throws(() => deliverGift(assigned, assigned.gifts[0].id, '', '2026-11-12'), /quién recibe/)
assert.throws(() => deliverGift(assigned, assigned.gifts[0].id, 'Apoderada', '2026-02-31'), /válida/)
assert.throws(() => deliverGift(assigned, assigned.gifts[0].id, 'Apoderada', '2025-11-12'), /campaña/)
for (const date of ['2026-01-01', '2026-11-12', '2026-12-30']) {
  const delivered = deliverGift(assigned, assigned.gifts[0].id, 'Apoderada ficticia', date)
  const summary = summarize('2026', 'todos', delivered)
  assert.equal(summary.totals.pending, 0)
  assert.equal(summary.totals.delivered, 1)
  assert.equal(summary.weeks.reduce((sum, w) => sum + w.delivered, 0), 1)
  assert.throws(() => deliverGift(delivered, assigned.gifts[0].id, 'Apoderada ficticia', date), /ya fue registrada/)
}
const nextCampaign = registerChild(registered, { ...child, campaign: '2025' })
assert.equal(summarize('2025', 'todos', nextCampaign).totals.enrolled, 1)
assert.equal(summarize('2026', 'todos', nextCampaign).totals.enrolled, 1)
assert.throws(() => registerChild(registered, { ...child, campaign: '2025', name: 'Otra persona' }), /otros datos/)
console.log('21 verificaciones del flujo correctas: inscripción, asignación, entrega, duplicados, fechas y campañas.')
