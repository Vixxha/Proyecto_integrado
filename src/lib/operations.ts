import type { Campaign, Gift, Registration, SystemData } from './data'

export function uniqueRegistrations(source: SystemData) {
  return [...new Map(source.registrations.map(r => [`${r.campaign}:${r.childId}`, r])).values()]
}

export function registerChild(source: SystemData, registration: Registration): SystemData {
  if (source.registrations.some(r => r.campaign === registration.campaign && r.childId === registration.childId)) {
    throw new Error('Este niño o niña ya está inscrito en la campaña seleccionada.')
  }
  if (!registration.childId.trim() || !registration.name?.trim() || !registration.guardian?.trim()) throw new Error('Completa el código, el nombre y el apoderado.')
  if (!validDate(registration.birthDate || '') || registration.birthDate! > `${registration.campaign}-12-31` || registration.birthDate! < `${Number(registration.campaign) - 15}-01-01`) throw new Error('Revisa la fecha de nacimiento: debe corresponder a un niño o niña de hasta 15 años en la campaña.')
  const existing = source.registrations.find(r => r.childId === registration.childId)
  if (existing && (existing.name !== registration.name || existing.birthDate !== registration.birthDate)) throw new Error('El código ya pertenece a un niño o niña con otros datos. Usa los datos existentes o un código distinto.')
  return { ...source, registrations: [...source.registrations, { ...registration }] }
}

export function assignGift(source: SystemData, campaign: Campaign, childId: string, giftName: string): SystemData {
  const registration = source.registrations.find(r => r.campaign === campaign && r.childId === childId)
  if (!registration) throw new Error('Primero debes inscribir al niño o niña en esta campaña.')
  if (!giftName.trim()) throw new Error('Indica el regalo que se asignará.')
  if (source.gifts.some(g => g.campaign === campaign && g.childId === childId)) throw new Error('Este niño o niña ya tiene un regalo asignado en la campaña.')
  const gift: Gift = { id: `${campaign}-${childId}`, campaign, childId, sector: registration.sector, giftName: giftName.trim(), deliveredAt: null }
  return { ...source, gifts: [...source.gifts, gift] }
}

export function deliverGift(source: SystemData, id: string, recipient: string, date: string): SystemData {
  const gift = source.gifts.find(g => g.id === id)
  if (!gift) throw new Error('No se encontró el regalo asignado.')
  if (gift.deliveredAt) throw new Error('Esta entrega ya fue registrada. No se volverá a contar.')
  if (!recipient.trim()) throw new Error('Indica quién recibe el regalo.')
  if (!validDate(date)) throw new Error('Indica una fecha de entrega válida.')
  if (!date.startsWith(`${gift.campaign}-`)) throw new Error('La fecha debe pertenecer al año de la campaña.')
  return { ...source, gifts: source.gifts.map(g => g.id === id ? { ...g, deliveredAt: date, recipient: recipient.trim() } : g) }
}

function validDate(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}
