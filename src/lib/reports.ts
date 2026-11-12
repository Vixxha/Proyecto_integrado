import { SECTORS, type Campaign, type Gift, type Registration, type SectorFilter, type SectorId, type SectorSummary, type summarize } from './data'

export type DashboardSummary = ReturnType<typeof summarize>
export interface CampaignReport {
  sectors: Omit<SectorSummary, 'progress'>[]
  deliveries: { sector: SectorId; date: string; delivered: number }[]
}
export type RemoteReports = Record<Campaign, CampaignReport>
export interface RecordsPage { total: number; records: { registration: Registration; gift: Gift | null }[] }

export function reportSummary(report: CampaignReport, campaign: Campaign, filter: SectorFilter): DashboardSummary {
  const allSectors = SECTORS.map(s => {
    const row = report.sectors.find(r => r.id === s.id)
    if (!row) throw new Error('El resumen recibido no contiene todos los sectores.')
    return { ...row, progress: row.assigned ? row.delivered / row.assigned * 100 : 0 }
  })
  const sectors = allSectors.filter(s => filter === 'todos' || s.id === filter)
  const totals = sectors.reduce((sum,s) => ({ enrolled: sum.enrolled+s.enrolled, assigned: sum.assigned+s.assigned, delivered: sum.delivered+s.delivered, pending: sum.pending+s.pending, progress: 0 }), { enrolled: 0, assigned: 0, delivered: 0, pending: 0, progress: 0 })
  totals.progress = totals.assigned ? totals.delivered / totals.assigned * 100 : 0
  const base = Date.parse(`${campaign}-11-09T12:00:00Z`)
  const weekMs = 7 * 86400000
  const offsets = report.deliveries.map(w => Math.floor((Date.parse(`${w.date}T12:00:00Z`)-base)/weekMs))
  const first = Math.min(0,...offsets), last = Math.max(5,...offsets)
  const counts = new Map<string, number>()
  report.deliveries.filter(w => filter === 'todos' || w.sector === filter).forEach(w => counts.set(w.date,(counts.get(w.date)||0)+w.delivered))
  const weeks = Array.from({ length: last-first+1 },(_,i) => {
    const date = new Date(base+(first+i)*weekMs).toISOString().slice(0,10)
    return { date, label: new Intl.DateTimeFormat('es-CL',{ day:'numeric',month:'short',timeZone:'UTC' }).format(new Date(`${date}T12:00:00Z`)).replace('.',''), delivered: counts.get(date)||0 }
  })
  return { totals, sectors, allSectors, weeks }
}
