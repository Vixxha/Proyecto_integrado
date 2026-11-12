import { useEffect, useRef, useState } from 'react'
import { publicConfig } from '@/config/public'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { Compass, Layers3, LocateFixed, MapPin, Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SECTORS, number, pendingColor, type SectorFilter, type SectorSummary } from '@/lib/data'

interface Props { sectors: SectorSummary[]; selected: SectorFilter; onSelect: (id: SectorFilter) => void }
const toLatLng = ([x, y]: number[]) => ({ lat: -33.504 - y * 0.00017, lng: -70.638 + x * 0.00015 })

function GoogleMap({ sectors, selected, onSelect, onError }: Props & { onError: () => void }) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const polygons = useRef<google.maps.Polygon[]>([])
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect
  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => { if (active && !mapRef.current) onError() }, 12000)
    const previousAuthFailure = (window as Window & { gm_authFailure?: () => void }).gm_authFailure
    const authFailure = () => { if (active) onError() }
    ;(window as Window & { gm_authFailure?: () => void }).gm_authFailure = authFailure
    setOptions({ key: publicConfig.googleMapsApiKey, v: 'weekly', language: 'es', region: 'CL' })
    importLibrary('maps').then(library => {
      if (!active || !container.current) return
      const { Map, Polygon } = library as google.maps.MapsLibrary
      const map = new Map(container.current, { center: { lat: -33.545, lng: -70.566 }, zoom: 12, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, gestureHandling: 'cooperative', styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }] })
      mapRef.current = map
      const bounds = new google.maps.LatLngBounds()
      polygons.current = SECTORS.map(sector => {
        sector.points.forEach(p => bounds.extend(toLatLng(p)))
        const polygon = new Polygon({ map, paths: sector.points.map(toLatLng), strokeColor: '#ffffff', strokeWeight: 2, fillOpacity: 0.64, fillColor: '#e7bc66' })
        polygon.addListener('click', () => selectRef.current(sector.id))
        return polygon
      })
      map.fitBounds(bounds, 24)
      window.clearTimeout(timeout)
      // Trigger styling from the most recent props after asynchronous loading.
      setReady(true)
    }).catch(() => { if (active) onError() })
    return () => {
      active = false
      window.clearTimeout(timeout)
      polygons.current.forEach(p => { google.maps.event.clearInstanceListeners(p); p.setMap(null) })
      polygons.current = []
      mapRef.current = null
      if ((window as Window & { gm_authFailure?: () => void }).gm_authFailure === authFailure) (window as Window & { gm_authFailure?: () => void }).gm_authFailure = previousAuthFailure
    }
  }, [onError])
  const [ready, setReady] = useState(false)
  useEffect(() => {
    polygons.current.forEach((polygon, index) => {
      const sector = sectors.find(s => s.id === SECTORS[index].id)!
      polygon.setOptions({ fillColor: pendingColor(sector.pending), fillOpacity: selected === 'todos' || selected === sector.id ? 0.7 : 0.18, strokeColor: selected === sector.id ? '#125b68' : '#ffffff', strokeWeight: selected === sector.id ? 4 : 2 })
    })
  }, [sectors, selected, ready])
  return <div ref={container} className="absolute inset-0" aria-label="Mapa de Google de La Florida con límites ilustrativos" />
}

function DemoMap({ sectors, selected, onSelect }: Props) {
  const [zoom, setZoom] = useState(1)
  return <>
    <svg viewBox="0 0 900 470" className="demo-map" aria-label="Mapa ilustrativo de los seis sectores de La Florida">
      <defs>
        <pattern id="blocks" width="38" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(-11)"><rect width="38" height="34" fill="#ecede8" /><rect x="3" y="3" width="31" height="27" rx="2" fill="#e2e5df" /><path d="M0 0H38M0 0V34" stroke="#fff" strokeWidth="3.5" /></pattern>
        <filter id="map-shadow"><feDropShadow dx="0" dy="2" stdDeviation="5" floodOpacity=".12" /></filter>
      </defs>
      <rect width="900" height="470" fill="url(#blocks)" />
      <g transform={`translate(${450 * (1 - zoom)} ${235 * (1 - zoom)}) scale(${zoom})`}>
        <path d="M695 -30 662 60 710 135 679 209 748 270 705 343 771 500H940V-30Z" fill="#dbe6d3" />
        <path d="M806 -30 742 64 798 153 758 228 830 316 782 400 832 500" fill="none" stroke="#c8d9be" strokeWidth="24" opacity=".65" />
        <path d="M50 190 290 137 510 115 698 83M0 360 280 301 552 277 720 246M218 -20 250 160 300 322 340 490M507 -20 510 142 545 300 605 490" stroke="#d0d4cd" strokeWidth="13" fill="none" />
        <path d="M50 190 290 137 510 115 698 83M0 360 280 301 552 277 720 246M218 -20 250 160 300 322 340 490M507 -20 510 142 545 300 605 490" stroke="#fffef6" strokeWidth="9" fill="none" />
        <path d="M0 432 208 380 417 398 706 433M50 55 300 43 573 27M100 -30 158 490M0 251 320 190 678 180" stroke="#fff" strokeWidth="6" fill="none" />
        <g fill="#6f7d75" fontSize="10" fontFamily="Geist Variable, sans-serif" letterSpacing="1.5"><text x="132" y="73">LA GRANJA</text><text x="120" y="420">LA PINTANA</text><text x="371" y="34">MACUL</text><text x="692" y="60">PEÑALOLÉN</text><text x="688" y="436">PUENTE ALTO</text></g>
        <g fill="#8b9687" fontSize="10" fontFamily="Geist Variable, sans-serif"><text transform="translate(223 89) rotate(76)">Av. Vicuña Mackenna</text><text transform="translate(103 334) rotate(-11)">Av. Santa Amalia</text><text transform="translate(687 188) rotate(64)">Precordillera</text></g>
        {SECTORS.map(sector => {
          const summary = sectors.find(s => s.id === sector.id)!
          const active = selected === 'todos' || selected === sector.id
          return <g key={sector.id} role="button" tabIndex={0} aria-label={`Seleccionar sector ${sector.name}, ${number(summary.pending)} pendientes`} aria-pressed={selected === sector.id} className="sector-shape" onClick={() => onSelect(sector.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(sector.id) } }}>
            <polygon points={sector.points.map(p => p.join(',')).join(' ')} fill={pendingColor(summary.pending)} fillOpacity={active ? 0.72 : 0.18} stroke={selected === sector.id ? '#125b68' : '#fff'} strokeWidth={selected === sector.id ? 3.5 : 2} strokeLinejoin="round" />
            <g transform={`translate(${sector.label[0]} ${sector.label[1]})`} opacity={active ? 1 : 0.6} pointerEvents="none"><rect x={-sector.name.length * 3.5 - 11} y="-12" width={sector.name.length * 7 + 22} height="25" rx="5" fill="white" filter="url(#map-shadow)" /><text textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="550" fill="#384841">{sector.name}</text></g>
          </g>
        })}
      </g>
    </svg>
    <div className="map-demo-label"><span className="size-1.5 rounded-full bg-primary" />Vista de demostración</div>
    <div className="map-compass" aria-hidden="true"><span>N</span><Compass size={23} strokeWidth={1.4} /></div>
    <div className="map-controls"><Button variant="outline" size="icon" aria-label="Acercar mapa" disabled={zoom >= 1.6} onClick={() => setZoom(z => Math.min(1.6, z + .2))}><Plus /></Button><Button variant="outline" size="icon" aria-label="Alejar mapa" disabled={zoom <= .8} onClick={() => setZoom(z => Math.max(.8, z - .2))}><Minus /></Button><Button variant="outline" size="icon" aria-label="Centrar mapa" onClick={() => setZoom(1)}><LocateFixed /></Button></div>
    <span className="map-demo-attribution">Cartografía ilustrativa · Sin base de Google Maps</span>
  </>
}

export function SectorMap(props: Props) {
  const [failed, setFailed] = useState(false)
  const errorRef = useRef(() => setFailed(true))
  const demo = !publicConfig.googleMapsApiKey || failed
  const selected = props.sectors.find(s => s.id === props.selected)
  return <>
    <div className="map-space">
      {demo ? <DemoMap {...props} /> : <GoogleMap {...props} onError={errorRef.current} />}
      {selected && <div className="map-detail" data-testid="map-detail"><div className="flex items-center justify-between gap-6"><span className="flex items-center gap-1.5 text-xs font-semibold"><MapPin size={13} />Sector {selected.name}</span><Button variant="ghost" size="icon" className="size-6" aria-label="Quitar filtro de sector" onClick={() => props.onSelect('todos')}><X /></Button></div><div className="mt-3 grid grid-cols-3 gap-5">{[['Asignados', selected.assigned], ['Entregados', selected.delivered], ['Pendientes', selected.pending]].map(([label, value]) => <div key={label}><span className="block text-[10px] text-muted-foreground">{label}</span><strong className="text-sm">{number(Number(value))}</strong></div>)}</div></div>}
    </div>
    <div className="map-legend"><span className="legend-title">Regalos pendientes</span><div className="flex flex-wrap items-center gap-x-4 gap-y-2">{[['#f7e6bc', '0–399'], ['#e7bc66', '400–599'], ['#c28528', '600 o más']].map(([color, label]) => <span key={label} className="flex items-center gap-1.5"><i style={{ background: color }} />{label}</span>)}</div></div>
    <div className="map-note"><Layers3 size={13} aria-hidden="true" /><span>Límites ilustrativos y datos de demo. No representan divisiones oficiales.</span></div>
    {!demo && <div className="sr-only" aria-label="Seleccionar un sector del mapa con teclado">{SECTORS.map(s => <button key={s.id} onClick={() => props.onSelect(s.id)}>{s.name}</button>)}</div>}
    {failed && <p role="status" className="px-6 pb-3 text-xs text-muted-foreground">Google Maps no está disponible. La vista de demostración sigue funcionando.</p>}
  </>
}
