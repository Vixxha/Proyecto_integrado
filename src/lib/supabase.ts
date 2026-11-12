import { createClient } from '@supabase/supabase-js'
import { publicConfig } from '@/config/public'
import { CAMPAIGNS, type Campaign, type Registration, type SectorFilter } from './data'
import type { RemoteReports, RecordsPage } from './reports'

const url = publicConfig.supabaseUrl.trim()
const key = publicConfig.supabasePublishableKey.trim()
function validateConfiguration() {
  if (publicConfig.mode === 'demo') return null
  if (!url || !key) return 'Falta la configuración pública de conexión del sistema.'
  try {
    if (new URL(url).protocol !== 'https:') return 'La conexión con Supabase debe usar HTTPS.'
  } catch { return 'La dirección de conexión del sistema no es válida.' }
  if (!key.startsWith('sb_publishable_')) return 'La aplicación solo admite una clave pública de Supabase.'
  return null
}
export const configurationError = validateConfiguration()
export const supabase = publicConfig.mode === 'supabase' && !configurationError ? createClient(url, key) : null

export async function loadRemoteDashboard(): Promise<RemoteReports> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('navidad_dashboard')
  if (error) throw new Error(error.message)
  const reports = data as unknown as RemoteReports
  for (const campaign of CAMPAIGNS) {
    if (!Array.isArray(reports?.[campaign]?.sectors) || !Array.isArray(reports?.[campaign]?.deliveries)) throw new Error('El resumen recibido no es válido.')
  }
  return reports
}

export async function loadRemoteRecords(campaign: Campaign, sector: SectorFilter, query: string, status: string, assignedOnly: boolean, page: number, signal?: AbortSignal): Promise<RecordsPage> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const request = supabase.rpc('navidad_records_page', {
    p_campaign: campaign, p_sector: sector === 'todos' ? null : sector, p_query: query.trim(),
    p_status: status, p_assigned_only: assignedOnly, p_limit: 15, p_offset: page * 15,
  })
  const { data, error } = await (signal ? request.abortSignal(signal) : request)
  if (error) throw new Error(error.message)
  const result = data as unknown as RecordsPage
  if (!Array.isArray(result?.records) || !Number.isSafeInteger(result?.total) || result.total < 0) throw new Error('La página recibida no es válida.')
  return result
}

export async function remoteRegister(registration: Registration) {
  const { error } = await supabase!.rpc('navidad_register_child', {
    p_campaign: registration.campaign, p_sector: registration.sector, p_child_id: registration.childId,
    p_name: registration.name, p_birth_date: registration.birthDate, p_guardian: registration.guardian,
    p_phone: registration.phone || '', p_address: registration.address || '',
  })
  if (error) throw new Error(error.message)
}

export async function remoteAssign(campaign: Campaign, childId: string, name: string) {
  const { error } = await supabase!.rpc('navidad_assign_gift', { p_campaign: campaign, p_child_id: childId, p_name: name })
  if (error) throw new Error(error.message)
}

export async function remoteDeliver(id: string, recipient: string, date: string) {
  const { data, error } = await supabase!.rpc('navidad_deliver_gift', { p_gift_id: id, p_recipient: recipient, p_date: date })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('La entrega ya fue registrada por otro usuario. Actualiza la vista.')
}
