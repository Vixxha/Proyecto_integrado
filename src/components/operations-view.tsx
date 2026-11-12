import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, ArrowRight, CheckCheck, Gift, Plus, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SECTORS, number, type Campaign, type Registration, type SectorFilter, type SectorId } from '@/lib/data'
import { uniqueRegistrations } from '@/lib/operations'
import { useSystem } from '@/lib/system-context'
import { loadRemoteRecords } from '@/lib/supabase'
import type { RecordsPage } from '@/lib/reports'

export type View = 'resumen' | 'inscripciones' | 'asignacion' | 'entregas'
export const VIEW_LABELS: Record<View, string> = { resumen: 'Resumen', inscripciones: 'Inscripciones', asignacion: 'Asignación de regalos', entregas: 'Entregas' }
const PAGE_SIZE = 15

export function OperationsView({ view, campaign, sector }: { view: Exclude<View, 'resumen'>; campaign: Campaign; sector: SectorFilter }) {
  const { source, revision, register, assign, deliver, canWrite, remote } = useSystem()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('todos')
  const [dialog, setDialog] = useState<'register' | 'assign' | 'deliver' | null>(null)
  const [selected, setSelected] = useState<Registration | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [registrationSector, setRegistrationSector] = useState<SectorId>(sector === 'todos' ? 'centro' : sector)
  const [remotePage, setRemotePage] = useState<RecordsPage>({ total: 0, records: [] })
  const [recordsLoading, setRecordsLoading] = useState(remote)
  const [listError, setListError] = useState('')
  const [reload, setReload] = useState(0)
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  useEffect(() => { const timer = window.setTimeout(() => { if (query !== debouncedQuery) { setDebouncedQuery(query); if (remote) setPage(0) } }, 250); return () => window.clearTimeout(timer) }, [query, remote, debouncedQuery])
  useEffect(() => {
    if (!remote) return
    let active = true
    const controller = new AbortController()
    setRecordsLoading(true); setListError('')
    loadRemoteRecords(campaign, sector, debouncedQuery, status, view === 'entregas', page, controller.signal).then(result => {
      if (!active) return
      const lastPage = Math.max(0, Math.ceil(result.total / PAGE_SIZE) - 1)
      if (page > lastPage) { setPage(lastPage); return }
      setRemotePage(result)
    }).catch(caught => { if (active) setListError(caught instanceof Error ? caught.message : 'No se pudieron cargar los registros.') })
      .finally(() => { if (active) setRecordsLoading(false) })
    return () => { active = false; controller.abort() }
  }, [remote, campaign, sector, debouncedQuery, status, view, page, revision, reload])
  const localGifts = useMemo(() => new Map(source.gifts.filter(g => g.campaign === campaign).map(g => [g.childId, g])), [source, campaign])
  const gifts = useMemo(() => remote ? new Map(remotePage.records.filter(row => row.gift).map(row => [row.registration.childId, row.gift!] as const)) : localGifts, [remote, remotePage, localGifts])
  const records = useMemo(() => uniqueRegistrations(source).filter(r => {
    if (r.campaign !== campaign || (sector !== 'todos' && r.sector !== sector)) return false
    const gift = localGifts.get(r.childId)
    if (view === 'entregas' && !gift) return false
    if (status === 'sin-asignar' && gift) return false
    if (status === 'pendientes' && (!gift || gift.deliveredAt)) return false
    if (status === 'entregados' && !gift?.deliveredAt) return false
    const text = `${r.childId} ${r.name || ''} ${r.guardian || ''}`.toLocaleLowerCase('es')
    return text.includes(query.trim().toLocaleLowerCase('es'))
  }), [source, campaign, sector, localGifts, view, query, status])
  const totalRecords = remote ? remotePage.total : records.length
  const pages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE))
  const currentPage = Math.min(page, pages - 1)
  const visible = remote ? remotePage.records.map(row => row.registration) : records.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santiago' }).format(new Date())
  const defaultDate = today.startsWith(campaign) ? today : `${campaign}-12-20`
  const dateText = (date: string) => new Intl.DateTimeFormat('es-CL', { timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))

  function open(kind: 'register' | 'assign' | 'deliver', registration: Registration | null = null) {
    setError(''); setMessage(''); setSelected(registration)
    setRegistrationSector(sector === 'todos' ? 'centro' : sector)
    setDialog(kind)
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !canWrite) return
    const form = new FormData(event.currentTarget)
    const field = (name: string) => String(form.get(name) || '').trim()
    setBusy(true); setError('')
    try {
      if (dialog === 'register') {
        await register({ campaign, sector: registrationSector, childId: field('childId'), name: field('name'), birthDate: field('birthDate'), guardian: field('guardian'), phone: field('phone'), address: field('address') })
        setMessage('Inscripción guardada. El niño o niña ya aparece en el resumen de su sector.')
      } else if (dialog === 'assign' && selected) {
        await assign(campaign, selected.childId, field('giftName'))
        setMessage('Regalo asignado. Se sumó a los pendientes de entrega.')
      } else if (dialog === 'deliver' && selected) {
        await deliver(gifts.get(selected.childId)!.id, field('recipient'), field('date'))
        setMessage('Entrega registrada. El regalo ya no está pendiente.')
      }
      setDialog(null)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo guardar el cambio.') }
    finally { setBusy(false) }
  }

  return <section className="operations-section" aria-label={VIEW_LABELS[view]} aria-busy={recordsLoading}>
    <div className="operation-heading"><div><h2>{VIEW_LABELS[view]}</h2><p>{view === 'inscripciones' ? 'Un registro por niño y campaña, para que nadie se cuente dos veces.' : view === 'asignacion' ? 'Asigna un regalo a cada niño inscrito y prepara las próximas entregas.' : 'Registra cada entrega y mantén los pendientes al día.'}</p></div>{view === 'inscripciones' && <Button onClick={() => open('register')} disabled={!canWrite}><Plus />Nueva inscripción</Button>}</div>
    {message && <div className="operation-message" role="status"><CheckCheck size={16} />{message}</div>}
    {!canWrite && <p className="operation-readonly">Tu perfil tiene acceso de lectura. Un operador puede registrar cambios.</p>}
    {recordsLoading && <p role="status" className="operation-storage-note">Cargando registros…</p>}
    {listError && <div role="alert" className="form-error mb-4">{listError}<Button variant="ghost" size="sm" onClick={() => setReload(v => v + 1)}>Reintentar carga</Button></div>}
    <Card><CardHeader className="operation-toolbar"><div className="operation-search"><Search size={16} aria-hidden="true" /><Input maxLength={120} aria-label="Buscar por nombre, código o apoderado" placeholder="Buscar por nombre, código o apoderado…" value={query} onChange={e => { setQuery(e.target.value); if (!remote) setPage(0) }} /></div><Select value={status} onValueChange={v => { setStatus(v); setPage(0) }}><SelectTrigger aria-label="Estado del registro" className="max-w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos los estados</SelectItem>{view !== 'entregas' && <SelectItem value="sin-asignar">Sin regalo asignado</SelectItem>}<SelectItem value="pendientes">Pendientes de entrega</SelectItem><SelectItem value="entregados">Entregados</SelectItem></SelectContent></Select></CardHeader>
      <Table><caption className="sr-only">Registros de {VIEW_LABELS[view].toLowerCase()}, campaña {campaign}</caption><TableHeader><TableRow><TableHead>Niño o niña</TableHead><TableHead>Sector</TableHead><TableHead>Apoderado/a</TableHead><TableHead>Regalo</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader><TableBody>{visible.map(r => {
        const gift = gifts.get(r.childId)
        return <TableRow key={`${r.campaign}-${r.childId}`}><TableCell><strong className="record-name">{r.name || r.childId}</strong><span className="record-code">{r.childId}</span></TableCell><TableCell>{SECTORS.find(s => s.id === r.sector)?.name}</TableCell><TableCell>{r.guardian || 'Sin información'}</TableCell><TableCell>{gift?.giftName || 'Sin asignar'}</TableCell><TableCell><Badge className={gift?.deliveredAt ? 'status-delivered' : gift ? 'status-pending' : 'status-unassigned'}>{gift?.deliveredAt ? 'Entregado' : gift ? 'Pendiente' : 'Sin asignar'}</Badge></TableCell><TableCell className="text-right">{!gift ? <Button variant="outline" size="sm" onClick={() => open('assign', r)} disabled={!canWrite}><Gift />Asignar regalo</Button> : !gift.deliveredAt ? <Button size="sm" onClick={() => open('deliver', r)} disabled={!canWrite}><CheckCheck />Registrar entrega</Button> : <span className="delivery-date">{dateText(gift.deliveredAt)}</span>}</TableCell></TableRow>
      })}</TableBody></Table>
      {!recordsLoading && !listError && visible.length === 0 && <div className="empty-records"><Users size={28} /><CardTitle>No hay registros para esta búsqueda</CardTitle><CardDescription>Prueba otro nombre, estado o sector.</CardDescription></div>}
      <div className="operation-pagination"><span>{number(totalRecords)} registros · Página {currentPage + 1} de {number(pages)}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={recordsLoading || currentPage === 0} onClick={() => setPage(currentPage - 1)} aria-label="Página anterior"><ArrowLeft /></Button><Button variant="outline" size="sm" disabled={recordsLoading || currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)} aria-label="Página siguiente"><ArrowRight /></Button></div></div>
    </Card>
    <p className="operation-storage-note">{remote ? 'Cambios guardados en el proyecto conectado de Supabase.' : 'Datos ficticios. Los cambios de esta demo se guardan solo en este navegador.'}</p>
    <Dialog open={dialog !== null} onOpenChange={value => { if (!value && !busy) setDialog(null) }}><DialogContent onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onPointerDownOutside={event => { if (busy) event.preventDefault() }}><DialogTitle className="text-lg font-semibold pr-6">{dialog === 'register' ? 'Nueva inscripción' : dialog === 'assign' ? 'Asignar regalo' : 'Registrar entrega'}</DialogTitle><DialogDescription className="mt-2 text-xs text-muted-foreground leading-relaxed">Campaña Navidad {campaign}. {selected ? `${selected.name || selected.childId}.` : 'Ingresa datos ficticios para probar el sistema.'}</DialogDescription><form onSubmit={submit} className="operation-form"><fieldset disabled={busy} className="contents">{dialog === 'register' ? <>
      <label>Código del niño o niña<Input name="childId" required maxLength={80} autoComplete="off" placeholder="DEMO-00001" /><small>Usa el mismo código para esta persona en futuras campañas.</small></label>
      <label>Nombre completo<Input name="name" required maxLength={160} autoComplete="off" /></label>
      <div className="form-columns"><label>Fecha de nacimiento<Input name="birthDate" type="date" required min={`${Number(campaign) - 15}-01-01`} max={`${campaign}-12-31`} /></label><label>Sector<Select value={registrationSector} onValueChange={v => setRegistrationSector(v as SectorId)}><SelectTrigger aria-label="Sector de la inscripción"><SelectValue /></SelectTrigger><SelectContent>{SECTORS.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></label></div>
      <label>Nombre del apoderado/a<Input name="guardian" required maxLength={160} autoComplete="off" /></label><div className="form-columns"><label>Teléfono (opcional)<Input name="phone" type="tel" maxLength={40} autoComplete="off" /></label><label>Dirección (opcional)<Input name="address" maxLength={240} autoComplete="off" /></label></div>
    </> : dialog === 'assign' ? <label>Regalo a asignar<Input name="giftName" required maxLength={160} placeholder="Ej.: set de arte" autoComplete="off" /></label> : <><label>Recibe el regalo<Input name="recipient" required maxLength={160} defaultValue={selected?.guardian || ''} autoComplete="off" /></label><label>Fecha de entrega<Input name="date" type="date" required defaultValue={defaultDate} min={`${campaign}-01-01`} max={`${campaign}-12-31`} /></label><p className="delivery-confirmation">Al guardar, el regalo pasará de pendiente a entregado. Esta entrega no podrá repetirse.</p></>}
      {error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancelar</Button><Button type="submit" disabled={busy || !canWrite}>{busy ? 'Guardando…' : dialog === 'register' ? 'Guardar inscripción' : dialog === 'assign' ? 'Asignar regalo' : 'Confirmar entrega'}</Button></div></fieldset></form></DialogContent></Dialog>
  </section>
}
