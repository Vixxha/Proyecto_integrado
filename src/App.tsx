import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpRight, CalendarDays, Check, CheckCheck, ChevronRight, CircleHelp, ClipboardList, Gift, Heart, Info, LayoutDashboard, MapPin, Menu, PackageCheck, PanelLeftClose, SlidersHorizontal, Sparkles, TreePine, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectorMap } from '@/components/sector-map'
import { SectorChart, StatusLegend, WeeklyChart } from '@/components/charts'
import { OperationsView, VIEW_LABELS, type View } from '@/components/operations-view'
import { useSystem } from '@/lib/system-context'
import { reportSummary } from '@/lib/reports'
import { supabase } from '@/lib/supabase'
import { AccountPassword } from '@/components/account-password'
import { CAMPAIGNS, SECTORS, number, percent, summarize, type Campaign, type SectorFilter, type SectorSummary } from '@/lib/data'

function readFilters() {
  const params = new URLSearchParams(window.location.search)
  const campaign = params.get('campana')
  const sector = params.get('sector')
  return { campaign: CAMPAIGNS.includes(campaign as Campaign) ? campaign as Campaign : '2026' as Campaign, sector: SECTORS.some(s => s.id === sector) ? sector as SectorFilter : 'todos' as SectorFilter }
}

function Brand() {
  return <div className="brand"><div className="brand-symbol" aria-hidden="true"><TreePine size={28} strokeWidth={1.7} /><span className="brand-star">✦</span></div><div><strong>La Florida</strong><span>MUNICIPALIDAD</span></div></div>
}

function Sidebar({ open, onClose, onHelp, view }: { open: boolean; onClose: () => void; onHelp: () => void; view: View }) {
  const panel = useRef<HTMLElement>(null)
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const change = () => setMobile(query.matches)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    if (!open || !mobile || !panel.current) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusable = () => [...panel.current!.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')]
    focusable()[0]?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const nodes = focusable()
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', trap)
      previousFocus?.focus()
    }
  }, [open, mobile])

  return <><div className={`sidebar-scrim ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden="true" /><aside ref={panel} inert={mobile && !open} role={mobile && open ? 'dialog' : undefined} aria-modal={mobile && open ? true : undefined} className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Navegación principal"><div className="sidebar-brand"><Brand /><Button variant="ghost" size="icon" className="mobile-close" onClick={onClose} aria-label="Cerrar menú"><X /></Button></div><div className="program-label">GESTIÓN SOCIAL</div><div className="program-name"><span className="program-icon"><Gift size={18} /></span><span>Navidad en La Florida<small>Sistema de regalos</small></span></div><div className="nav-label">PRINCIPAL</div><nav>{([{ id: 'resumen', icon: LayoutDashboard }, { id: 'inscripciones', icon: Users }, { id: 'asignacion', icon: Gift }, { id: 'entregas', icon: PackageCheck }] as const).map(({ id, icon: Icon }) => <a key={id} className={`nav-item ${view === id ? 'active' : ''}`} href={`#${id}`} aria-current={view === id ? 'page' : undefined} onClick={onClose}><Icon size={18} />{VIEW_LABELS[id]}{view === id && <span className="nav-active-dot" />}</a>)}</nav><div className="sidebar-bottom"><div className="christmas-note"><span className="note-stars" aria-hidden="true">✧</span><Heart size={19} strokeWidth={1.6} /><strong>Una Navidad para todos</strong><p>Cada regalo, una sonrisa.<br />Juntos llegamos más lejos.</p><span className="note-trees" aria-hidden="true"><TreePine size={57} /><TreePine size={39} /><TreePine size={68} /></span></div><Button variant="ghost" className="help-button" onClick={onHelp}><CircleHelp size={17} />Acerca de esta demo<ArrowUpRight size={14} /></Button><div className="sidebar-footer"><span className="municipal-avatar">LF</span><span>Municipalidad de La Florida<small>Dirección de Desarrollo Comunitario</small></span></div></div></aside></>
}

function Metric({ title, value, icon: Icon, className, children, testId }: { title: string; value: number; icon: LucideIcon; className?: string; children: React.ReactNode; testId: string }) {
  return <Card className={`metric ${className || ''}`}><div className="metric-top"><span>{title}</span><span className="metric-icon"><Icon size={19} strokeWidth={1.7} /></span></div><strong data-testid={testId}>{number(value)}</strong><div className="metric-bottom">{children}</div></Card>
}

function Progress({ value }: { value: number }) {
  return <div className="progress-cell"><div role="progressbar" aria-label="Avance de entregas" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${value}%` }} /></div><span>{percent(value)}</span></div>
}

function SummaryTable({ sectors, totals }: { sectors: SectorSummary[]; totals: ReturnType<typeof summarize>['totals'] }) {
  const [descending, setDescending] = useState(true)
  const sorted = [...sectors].sort((a, b) => descending ? b.pending - a.pending : a.pending - b.pending)
  return <Card className="table-card"><CardHeader><div><CardTitle>Resumen por sector</CardTitle><CardDescription>El detalle que necesitas para organizar las próximas entregas.</CardDescription></div><Badge className="border-border text-muted-foreground">{sectors.length} {sectors.length === 1 ? 'sector' : 'sectores'}</Badge></CardHeader><Table><caption className="sr-only">Resumen de inscritos y regalos por sector. Ordenable por pendientes.</caption><TableHeader><TableRow><TableHead>Sector</TableHead><TableHead className="text-right">Niños inscritos</TableHead><TableHead className="text-right">Asignados</TableHead><TableHead className="text-right" aria-sort={descending ? 'descending' : 'ascending'}><Button variant="ghost" size="sm" className="-mr-2 text-foreground" onClick={() => setDescending(v => !v)} aria-label={`Ordenar pendientes de ${descending ? 'menor a mayor' : 'mayor a menor'}`}>Pendientes{descending ? <ArrowDown /> : <ArrowUp />}</Button></TableHead><TableHead className="text-right">Entregados</TableHead><TableHead className="w-[210px]">Avance</TableHead></TableRow></TableHeader><TableBody>{sorted.map(s => <TableRow key={s.id} data-testid={`row-${s.id}`}><TableCell><span className="sector-table-name"><span className="sector-dot" />{s.name}</span></TableCell><TableCell className="text-right">{number(s.enrolled)}</TableCell><TableCell className="text-right">{number(s.assigned)}</TableCell><TableCell className="text-right"><span className="pending-count">{number(s.pending)}</span></TableCell><TableCell className="text-right">{number(s.delivered)}</TableCell><TableCell><Progress value={s.progress} /></TableCell></TableRow>)}</TableBody><TableFooter><TableRow><TableCell>Total</TableCell><TableCell className="text-right">{number(totals.enrolled)}</TableCell><TableCell className="text-right">{number(totals.assigned)}</TableCell><TableCell className="text-right text-amber-800">{number(totals.pending)}</TableCell><TableCell className="text-right">{number(totals.delivered)}</TableCell><TableCell><Progress value={totals.progress} /></TableCell></TableRow></TableFooter></Table><div className="table-footnote"><Info size={13} />Cada niño se cuenta una sola vez por campaña. Avance = entregados / asignados.</div></Card>
}

export default function App() {
  const { source, reports, remote, session, error: dataError } = useSystem()
  const getView = () => {
    const value = window.location.hash.slice(1)
    return Object.hasOwn(VIEW_LABELS, value) ? value as View : 'resumen'
  }
  const [view, setView] = useState<View>(getView)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  useEffect(() => {
    const change = () => { const next = window.location.hash.slice(1); if (Object.hasOwn(VIEW_LABELS, next)) setView(next as View); setMenuOpen(false) }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  const initial = useMemo(readFilters, [])
  const [campaign, setCampaign] = useState<Campaign>(initial.campaign)
  const [sector, setSector] = useState<SectorFilter>(initial.sector)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [exported, setExported] = useState(false)
  const data = useMemo(() => remote && reports ? reportSummary(reports[campaign], campaign, sector) : summarize(campaign, sector, source), [campaign, sector, source, remote, reports])
  const { totals, sectors, allSectors, weeks } = data
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('campana', campaign)
    if (sector === 'todos') url.searchParams.delete('sector'); else url.searchParams.set('sector', sector)
    window.history.replaceState({}, '', url)
  }, [campaign, sector])
  useEffect(() => {
    const onPop = () => { const filters = readFilters(); setCampaign(filters.campaign); setSector(filters.sector) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  useEffect(() => { if (!exported) return; const timer = window.setTimeout(() => setExported(false), 3500); return () => clearTimeout(timer) }, [exported])
  useEffect(() => {
    if (!menuOpen) return
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [menuOpen])

  async function exportSummary() {
    if (exporting) return
    setExporting(true); setExportError('')
    try { const { downloadSummary } = await import('@/lib/excel'); await downloadSummary(campaign, sector, source, data); setExported(true) }
    catch { setExportError('No se pudo generar el Excel. Revisa que ExcelJS esté instalado e inténtalo nuevamente.') }
    finally { setExporting(false) }
  }

  return <div className="app-shell"><a href="#contenido" className="skip-link">Saltar al contenido</a><Sidebar view={view} open={menuOpen} onClose={() => setMenuOpen(false)} onHelp={() => setShowHelp(v => !v)} /><div className="main-shell"><header className="topbar"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><Menu /></Button><span className="desktop-sidebar-icon" aria-hidden="true"><PanelLeftClose size={17} /></span><span className="breadcrumb">Gestión de Navidad<ChevronRight size={13} /><strong>{VIEW_LABELS[view]}</strong></span></div><div className={`topbar-right ${session ? 'has-account' : ''}`}><span className="demo-top"><i />{remote ? 'Supabase conectado' : 'Demo local'}</span><span className="topbar-divider" />{session && <AccountPassword />}{session && <Button variant="ghost" size="sm" onClick={() => void supabase!.auth.signOut()}>Cerrar sesión</Button>}<span className="user-avatar" aria-label="Perfil de demostración">AD</span></div></header><main id="contenido"><div className="page-heading"><div><div className="eyebrow"><span />CAMPAÑA NAVIDEÑA {campaign}</div><h1>Una Navidad, miles de sonrisas<span>.</span></h1><p>Una mirada al avance de los regalos para los niños y niñas de La Florida.</p></div><Button variant="outline" className="export-button" onClick={exportSummary} disabled={exporting}>{exported ? <Check /> : <ArrowDownToLine />}{exporting ? 'Generando Excel…' : exported ? 'Excel descargado' : 'Descargar Excel'}</Button></div><div className="overview-label"><h2>{view === 'resumen' ? 'Resumen general' : VIEW_LABELS[view]}</h2><Badge className="demo-badge"><Sparkles size={11} />Datos ficticios</Badge><span className="snapshot-date">Corte de demo · 20 dic {campaign}</span></div><section className="filters" aria-label="Filtros del dashboard"><div className="filter-intro"><SlidersHorizontal size={15} /><span>Filtrar por</span></div><div className="filter-field"><label id="campaign-label" htmlFor="campaign">Campaña</label><Select value={campaign} onValueChange={v => setCampaign(v as Campaign)}><SelectTrigger id="campaign" aria-labelledby="campaign-label"><span className="flex items-center gap-2"><CalendarDays size={14} className="text-muted-foreground" /><SelectValue /></span></SelectTrigger><SelectContent>{CAMPAIGNS.map(y => <SelectItem value={y} key={y}>Navidad {y}</SelectItem>)}</SelectContent></Select></div><div className="filter-field sector-filter"><label id="sector-label" htmlFor="sector">Sector</label><Select value={sector} onValueChange={v => setSector(v as SectorFilter)}><SelectTrigger id="sector" aria-labelledby="sector-label"><span className="flex items-center gap-2"><MapPin size={14} className="text-muted-foreground" /><SelectValue /></span></SelectTrigger><SelectContent><SelectItem value="todos">Todos los sectores</SelectItem>{SECTORS.map(s => <SelectItem value={s.id} key={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>{sector !== 'todos' && <Button variant="ghost" size="sm" className="clear-filter" onClick={() => setSector('todos')}><X size={13} />Limpiar sector</Button>}<span className="filter-context"><span />{sector === 'todos' ? 'Vista de toda la comuna' : `Sector ${SECTORS.find(s => s.id === sector)?.name}`}</span></section><div className="sr-only" role="status" aria-live="polite">Campaña {campaign}, {sector === 'todos' ? 'todos los sectores' : sector}. {number(totals.enrolled)} niños inscritos, {number(totals.pending)} regalos pendientes.</div>{(exportError || dataError) && <p className="form-error mb-4" role="alert">{exportError || dataError}</p>}{view === 'resumen' ? <><section className="metrics" aria-label="Indicadores de la campaña"><Metric title="Niños inscritos" value={totals.enrolled} icon={Users} testId="enrolled"><span className="metric-neutral-note">Inscripciones únicas en la campaña</span></Metric><Metric title="Regalos asignados" value={totals.assigned} icon={Gift} testId="assigned"><span className="metric-small-percent">{percent(totals.enrolled ? totals.assigned / totals.enrolled * 100 : 0)}</span><span>de los niños inscritos</span></Metric><Metric title="Pendientes de entrega" value={totals.pending} icon={ClipboardList} className="pending-metric" testId="pending"><span className="pending-small-dot" /><span>Asignados que aún no se entregan</span></Metric><Metric title="Regalos entregados" value={totals.delivered} icon={CheckCheck} className="delivered-metric" testId="delivered"><span className="metric-small-percent"><ArrowUpRight size={12} />{percent(totals.progress)}</span><span>de avance en entregas</span></Metric></section><section className="map-chart-grid" aria-label="Distribución territorial de regalos"><Card className="map-card"><CardHeader><div><CardTitle>Los regalos, en el territorio</CardTitle><CardDescription>Selecciona un sector para explorar su avance.</CardDescription></div><Badge className="map-area-badge"><MapPin size={11} />La Florida, RM</Badge></CardHeader><SectorMap sectors={allSectors} selected={sector} onSelect={setSector} /></Card><SectorChart sectors={sectors} /></section><div className="lower-grid"><WeeklyChart weeks={weeks} delivered={totals.delivered} /><Card className="campaign-progress-card"><div className="flex items-center justify-between"><span className="progress-icon"><Gift size={20} strokeWidth={1.6} /></span><Badge className="border-primary/15 bg-white/70 text-primary">Navidad {campaign}</Badge></div><h2>Cada entrega nos acerca<br />a una nueva sonrisa.</h2><p>Así vamos con los regalos asignados<br className="hidden xl:block" /> en {sector === 'todos' ? 'toda la comuna' : `el sector ${SECTORS.find(s => s.id === sector)?.name}`}.</p><div className="overall-progress"><strong>{percent(totals.progress)}</strong><span>de avance</span></div><Progress value={totals.progress} /><div className="progress-card-bottom"><StatusLegend /><span>{number(totals.pending)} por entregar</span></div><TreePine className="progress-tree" size={143} strokeWidth={.7} aria-hidden="true" /></Card></div><SummaryTable sectors={sectors} totals={totals} /></> : <OperationsView key={`${view}-${campaign}-${sector}`} view={view} campaign={campaign} sector={sector} />}<footer className="page-footer"><span><span className="size-1.5 rounded-full bg-primary/60" />Municipalidad de La Florida · Gestión de Navidad</span><span>Hecho para llevar más sonrisas <Heart size={11} /></span></footer>{showHelp && <Card className="help-panel" role="region" aria-label="Acerca de esta demo"><div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Acerca de esta demostración</h2><Button size="icon" variant="ghost" aria-label="Cerrar información" onClick={() => setShowHelp(false)}><X /></Button></div><p>Sistema con datos ficticios de las campañas 2025 y 2026. Los límites del mapa son ilustrativos. Los filtros actualizan todas las secciones y el archivo exportado.</p><p>Las inscripciones, asignaciones y entregas actualizan el resumen. La descarga Excel respeta los filtros. En modo demo los cambios quedan en este navegador; con Supabase se requiere una cuenta municipal autorizada.</p></Card>}</main></div></div>
}
