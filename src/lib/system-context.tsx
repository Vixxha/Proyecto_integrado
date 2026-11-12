import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { DEMO_DATA, type Campaign, type Registration, type SystemData } from './data'
import { assignGift, deliverGift, registerChild } from './operations'
import { configurationError, loadRemoteDashboard, remoteAssign, remoteDeliver, remoteRegister, supabase } from './supabase'
import type { RemoteReports } from './reports'
import { completeAuthRedirect } from './auth-redirect'
import { loginErrorMessage } from './auth-errors'

const STORAGE_KEY = 'la-florida-navidad-demo-v1'
interface Delta { registrations: Registration[]; gifts: SystemData['gifts'] }
interface SystemContext {
  source: SystemData; loading: boolean; error: string | null; session: Session | null; remote: boolean; canWrite: boolean
  reports: RemoteReports | null; revision: number
  register: (registration: Registration) => Promise<void>
  assign: (campaign: Campaign, childId: string, name: string) => Promise<void>
  deliver: (id: string, recipient: string, date: string) => Promise<void>
  refresh: () => Promise<void>
}
const Context = createContext<SystemContext | null>(null)
const EMPTY: SystemData = { registrations: [], gifts: [] }

function loadDemo(): { source: SystemData; delta: Delta; error: string | null } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const delta: Delta = stored ? JSON.parse(stored) : { registrations: [], gifts: [] }
    if (!Array.isArray(delta.registrations) || !Array.isArray(delta.gifts)) throw new Error('invalid')
    const gifts = new Map(DEMO_DATA.gifts.map(g => [g.id, g]))
    delta.gifts.forEach(g => gifts.set(g.id, g))
    return { source: { registrations: [...DEMO_DATA.registrations, ...delta.registrations], gifts: [...gifts.values()] }, delta, error: null }
  } catch {
    return { source: DEMO_DATA, delta: { registrations: [], gifts: [] }, error: 'No se pudieron recuperar los cambios locales. Se muestran los datos de prueba originales.' }
  }
}

export function SystemProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => supabase || configurationError ? { source: EMPTY, delta: { registrations: [], gifts: [] }, error: configurationError } : loadDemo())
  const [source, setSource] = useState<SystemData>(initial.source)
  const [reports, setReports] = useState<RemoteReports | null>(null)
  const [revision, setRevision] = useState(0)
  const current = useRef(source)
  const delta = useRef<Delta>(initial.delta)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState<string | null>(initial.error)
  const [role, setRole] = useState<string | null>(null)
  const busy = useRef(false)
  const loadVersion = useRef(0)
  const refresh = useCallback(async (quiet = false) => {
    if (!supabase) return
    const version = ++loadVersion.current
    if (!quiet) setLoading(true)
    try {
      const { data: auth, error: authError } = await supabase.auth.getSession()
      if (authError) throw new Error(loginErrorMessage(authError))
      if (version !== loadVersion.current) return
      if (!auth.session) { current.current = EMPTY; setSource(EMPTY); return }
      const { data: member, error: memberError } = await supabase.from('navidad_staff').select('role').eq('user_id', auth.session.user.id).maybeSingle()
      if (memberError) throw memberError
      if (!member) throw new Error('Tu cuenta no tiene acceso al sistema. Solicita al administrador que te incorpore al equipo municipal.')
      if (version !== loadVersion.current) return
      setRole(member.role)
      const loaded = await loadRemoteDashboard()
      if (version !== loadVersion.current) return
      setReports(loaded)
      setRevision(v => v + 1)
      setError(null)
    } catch (caught) { if (version === loadVersion.current) setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los datos.') }
    finally { if (version === loadVersion.current) setLoading(false) }
  }, [])

  useEffect(() => {
    if (!supabase) return
    let active = true
    let unsubscribe: (() => void) | undefined
    void completeAuthRedirect(supabase).then(callbackError => {
      if (!active) return
      if (callbackError) setError(callbackError)
      const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, next) => {
        if (!active) return
        setSession(next)
        if (!next) { ++loadVersion.current; current.current = EMPTY; setSource(EMPTY); setReports(null); setRole(null); setLoading(false) }
        else window.setTimeout(() => { if (active) void refresh() }, 0)
      })
      unsubscribe = () => subscription.unsubscribe()
    })
    return () => { active = false; ++loadVersion.current; unsubscribe?.() }
  }, [refresh])

  async function mutate(next: () => SystemData, remote: () => Promise<void>, update: (data: SystemData) => Delta) {
    if (busy.current) throw new Error('Hay otro cambio en curso. Espera un momento.')
    busy.current = true
    try {
      if (supabase) {
        await remote()
        await refresh(true)
      } else {
        const data = next()
        const nextDelta = update(data)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDelta)) }
        catch { throw new Error('No se pudo guardar el cambio en este navegador. Revisa el espacio o los permisos de almacenamiento.') }
        delta.current = nextDelta; current.current = data; setSource(data)
      }
    } finally { busy.current = false }
  }
  const value: SystemContext = {
    source, reports, revision, loading, error, session, remote: Boolean(supabase), canWrite: !configurationError && (!supabase || role === 'operator' || role === 'admin'), refresh,
    register: registration => mutate(() => registerChild(current.current, registration), () => remoteRegister(registration), () => ({ ...delta.current, registrations: [...delta.current.registrations, registration] })),
    assign: (campaign, childId, name) => mutate(() => assignGift(current.current, campaign, childId, name), () => remoteAssign(campaign, childId, name), data => ({ ...delta.current, gifts: [...delta.current.gifts, data.gifts[data.gifts.length - 1]] })),
    deliver: (id, recipient, date) => mutate(() => deliverGift(current.current, id, recipient, date), () => remoteDeliver(id, recipient, date), data => ({ ...delta.current, gifts: [...delta.current.gifts.filter(g => g.id !== id), data.gifts.find(g => g.id === id)!] })),
  }
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useSystem() {
  const context = useContext(Context)
  if (!context) throw new Error('Falta SystemProvider.')
  return context
}
