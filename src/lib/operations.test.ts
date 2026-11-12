import { describe, expect, it } from 'vitest'
import { assignGift, deliverGift, registerChild, uniqueRegistrations } from './operations'
import { summarize, type Registration, type SystemData } from './data'

const child: Registration = { campaign: '2026', childId: 'DEMO-TEST-001', sector: 'centro', name: 'Niña de prueba', birthDate: '2019-04-12', guardian: 'Apoderada de prueba' }
const empty: SystemData = { registrations: [], gifts: [] }

describe('registration, assignment and delivery', () => {
  it('keeps the summary consistent through the full lifecycle', () => {
    const registered = registerChild(empty, child)
    expect(summarize('2026', 'todos', registered).totals).toMatchObject({ enrolled: 1, assigned: 0, pending: 0, delivered: 0 })
    const assigned = assignGift(registered, '2026', child.childId, 'Set de arte')
    expect(summarize('2026', 'todos', assigned).totals).toMatchObject({ enrolled: 1, assigned: 1, pending: 1, delivered: 0 })
    const delivered = deliverGift(assigned, assigned.gifts[0].id, 'Apoderada de prueba', '2026-11-12')
    const summary = summarize('2026', 'todos', delivered)
    expect(summary.totals).toMatchObject({ enrolled: 1, assigned: 1, pending: 0, delivered: 1, progress: 100 })
    expect(summary.weeks.reduce((sum, w) => sum + w.delivered, 0)).toBe(1)
    expect(empty.registrations).toHaveLength(0)
  })
  it('rejects duplicate registrations and gifts', () => {
    const registered = registerChild(empty, child)
    expect(() => registerChild(registered, child)).toThrow(/ya está inscrito/)
    const assigned = assignGift(registered, '2026', child.childId, 'Set de arte')
    expect(() => assignGift(assigned, '2026', child.childId, 'Pelota')).toThrow(/ya tiene/)
    expect(() => assignGift(empty, '2026', child.childId, 'Pelota')).toThrow(/Primero/)
  })
  it('rejects repeated delivery and invalid dates', () => {
    const assigned = assignGift(registerChild(empty, child), '2026', child.childId, 'Set de arte')
    const id = assigned.gifts[0].id
    expect(() => deliverGift(assigned, id, '', '2026-11-12')).toThrow(/quién recibe/)
    expect(() => deliverGift(assigned, id, 'Apoderada', '2026-02-31')).toThrow(/válida/)
    expect(() => deliverGift(assigned, id, 'Apoderada', '2025-11-12')).toThrow(/campaña/)
    const delivered = deliverGift(assigned, id, 'Apoderada', '2026-11-12')
    expect(() => deliverGift(delivered, id, 'Apoderada', '2026-11-12')).toThrow(/ya fue registrada/)
  })
  it('allows one child in multiple campaigns without changing their identity', () => {
    const registered = registerChild(empty, child)
    const both = registerChild(registered, { ...child, campaign: '2025' })
    expect(summarize('2025', 'todos', both).totals.enrolled).toBe(1)
    expect(summarize('2026', 'todos', both).totals.enrolled).toBe(1)
    expect(() => registerChild(registered, { ...child, campaign: '2025', name: 'Otra persona' })).toThrow(/otros datos/)
    expect(uniqueRegistrations({ ...both, registrations: [...both.registrations, child] })).toHaveLength(2)
  })
  it('includes deliveries outside the six original fixture weeks', () => {
    const assigned = assignGift(registerChild(empty, child), '2026', child.childId, 'Pelota')
    const delivered = deliverGift(assigned, assigned.gifts[0].id, 'Apoderada', '2026-12-30')
    const summary = summarize('2026', 'todos', delivered)
    expect(summary.weeks.reduce((sum, w) => sum + w.delivered, 0)).toBe(1)
    expect(summary.weeks.at(-1)?.delivered).toBe(1)
  })
})
