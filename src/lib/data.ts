export const CAMPAIGNS = ['2026', '2025'] as const
export type Campaign = typeof CAMPAIGNS[number]
export type SectorId = 'centro' | 'norte' | 'sur' | 'oriente' | 'poniente' | 'cordillera'
export type SectorFilter = SectorId | 'todos'

// All boundaries and counts are illustrative, not official municipal data.
export const SECTORS: { id: SectorId; name: string; short: string; points: number[][]; label: number[] }[] = [
  { id: 'norte', name: 'Norte', short: 'Norte', points: [[315,75],[452,58],[489,146],[390,166],[305,142]], label: [394,113] },
  { id: 'centro', name: 'Centro', short: 'Centro', points: [[305,142],[390,166],[489,146],[510,249],[396,263],[294,231]], label: [403,207] },
  { id: 'oriente', name: 'Oriente', short: 'Oriente', points: [[452,58],[548,84],[610,153],[618,229],[510,249],[489,146]], label: [549,170] },
  { id: 'poniente', name: 'Poniente', short: 'Poniente', points: [[305,142],[294,231],[396,263],[374,350],[273,329],[246,236]], label: [321,276] },
  { id: 'sur', name: 'Sur', short: 'Sur', points: [[396,263],[510,249],[552,334],[502,412],[374,399],[374,350]], label: [452,337] },
  { id: 'cordillera', name: 'Cordillera', short: 'Cordillera', points: [[618,229],[671,277],[633,370],[555,421],[502,412],[552,334],[510,249]], label: [593,323] },
]

export interface Registration { campaign: Campaign; childId: string; sector: SectorId; name?: string; birthDate?: string; guardian?: string; phone?: string; address?: string }
export interface Gift { id: string; campaign: Campaign; childId: string; sector: SectorId; deliveredAt: string | null; giftName?: string; recipient?: string }
export interface SystemData { registrations: Registration[]; gifts: Gift[] }
export interface SectorSummary { id: SectorId; name: string; enrolled: number; assigned: number; delivered: number; pending: number; progress: number }

const FIXTURES: Record<SectorId, [number, number, number]> = {
  centro: [2450, 2300, 1900], norte: [2180, 2020, 1640], sur: [2640, 2380, 1590],
  oriente: [1960, 1730, 1150], poniente: [2230, 1950, 1410], cordillera: [1380, 1140, 650],
}
export function weekDates(campaign: Campaign) {
  return Array.from({ length: 6 }, (_, i) => `${campaign}-${i < 4 ? '11' : '12'}-${String(i < 4 ? 9 + i * 7 : 7 + (i - 4) * 7).padStart(2, '0')}`)
}

function createDemoData() {
  const registrations: Registration[] = []
  const gifts: Gift[] = []
  for (const campaign of CAMPAIGNS) {
    const dates = weekDates(campaign)
    for (const { id: sector } of SECTORS) {
      const factor = campaign === '2026' ? 1 : 0.81
      const [enrolled, assigned, delivered] = FIXTURES[sector].map(n => Math.round(n * factor))
      for (let i = 0; i < enrolled; i++) {
        const childId = `${sector}-${i}`
        const registration: Registration = { campaign, childId, sector, name: `Niño/a de prueba ${i + 1} · ${sector}`, birthDate: `${2015 + i % 10}-06-15`, guardian: `Apoderado/a de prueba ${i + 1}`, phone: '', address: `Dirección ficticia ${i + 1}, La Florida` }
        registrations.push(registration)
        // Deliberately repeated applications exercise per-campaign deduplication.
        if (i % 120 === 0) registrations.push({ ...registration })
        if (i < assigned) {
          const bucket = i % 100
          const week = bucket < 8 ? 0 : bucket < 20 ? 1 : bucket < 39 ? 2 : bucket < 62 ? 3 : bucket < 84 ? 4 : 5
          gifts.push({ id: `${campaign}-${childId}`, campaign, childId, sector, deliveredAt: i < delivered ? dates[week] : null, giftName: ['Set de arte', 'Juego de construcción', 'Juego de mesa', 'Pelota deportiva'][i % 4], recipient: i < delivered ? registration.guardian : undefined })
        }
      }
    }
  }
  return { registrations, gifts }
}

export const DEMO_DATA = createDemoData()
export const number = (n: number) => new Intl.NumberFormat('es-CL').format(n)
export const percent = (n: number) => `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(n)} %`
export const COLORS = { delivered: '#167383', pending: '#edb350' }
export function pendingColor(pending: number) { return pending < 400 ? '#f7e6bc' : pending < 600 ? '#e7bc66' : '#c28528' }

export function summarize(campaign: Campaign, filter: SectorFilter = 'todos', source = DEMO_DATA) {
  const campaignRegistrations = source.registrations.filter(r => r.campaign === campaign)
  const campaignGifts = source.gifts.filter(g => g.campaign === campaign)
  const allSectors: SectorSummary[] = SECTORS.map(sector => {
    const enrolled = new Set(campaignRegistrations.filter(r => r.sector === sector.id).map(r => r.childId)).size
    const gifts = campaignGifts.filter(g => g.sector === sector.id)
    const assigned = gifts.length
    const delivered = gifts.filter(g => g.deliveredAt !== null).length
    return { id: sector.id, name: sector.name, enrolled, assigned, delivered, pending: assigned - delivered, progress: assigned ? delivered / assigned * 100 : 0 }
  })
  const sectors = allSectors.filter(s => filter === 'todos' || s.id === filter)
  // Unique children are counted once in a campaign, including across repeated applications.
  const enrolled = new Set(campaignRegistrations.filter(r => filter === 'todos' || r.sector === filter).map(r => r.childId)).size
  const gifts = campaignGifts.filter(g => filter === 'todos' || g.sector === filter)
  const assigned = gifts.length
  const delivered = gifts.filter(g => g.deliveredAt !== null).length
  const totals = { enrolled, assigned, delivered, pending: assigned - delivered, progress: assigned ? delivered / assigned * 100 : 0 }
  const base = Date.parse(`${campaign}-11-09T12:00:00Z`)
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const offsets = campaignGifts.filter(g => g.deliveredAt).map(g => Math.floor((Date.parse(`${g.deliveredAt}T12:00:00Z`) - base) / weekMs))
  const firstWeek = Math.min(0, ...offsets)
  const lastWeek = Math.max(5, ...offsets)
  const dates = Array.from({ length: lastWeek - firstWeek + 1 }, (_, i) => new Date(base + (firstWeek + i) * weekMs).toISOString().slice(0, 10))
  const weeks = dates.map(date => ({
    date,
    label: new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)).replace('.', ''),
    delivered: gifts.filter(g => g.deliveredAt && g.deliveredAt >= date && g.deliveredAt < new Date(Date.parse(`${date}T12:00:00Z`) + weekMs).toISOString().slice(0, 10)).length,
  }))
  return { totals, sectors, allSectors, weeks }
}
