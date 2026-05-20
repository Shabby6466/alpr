'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Camera, Journey } from '@/types'

export interface PlateTrailPoint {
  lat: number
  lng: number
  cameraName: string
  timestamp: string
  count: number
}

const TRAIL_COLORS = ['#e8a000', '#d93a3a', '#2f7fc1', '#2db55d', '#9b59b6', '#e67e22']

function injectStyles() {
  if (typeof document === 'undefined') return
  let s = document.getElementById('opsmap-styles')
  if (!s) {
    s = document.createElement('style')
    s.id = 'opsmap-styles'
    document.head.appendChild(s)
  }
  s.textContent = `
    @keyframes opsmap-pulse {
      0% { transform: scale(1); opacity: 0.7; }
      100% { transform: scale(2.8); opacity: 0; }
    }
    @keyframes opsmap-move {
      to { stroke-dashoffset: -120; }
    }
    .opsmap-trail-anim { animation: opsmap-move 2s linear infinite; }
    
    .leaflet-container { background: #0a0c0e !important; }
    .ops-page.light-mode .leaflet-container { background: #f2f2f7 !important; }
    
    .leaflet-popup-content-wrapper {
      background: #12161a !important;
      border: 1px solid #e8a000 !important;
      border-radius: 0 !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.8) !important;
      color: #c8d0d8 !important;
    }
    .ops-page.light-mode .leaflet-popup-content-wrapper {
      background: #ffffff !important;
      border: 1px solid #d48a00 !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1) !important;
      color: #1d1d1f !important;
    }
    
    .leaflet-popup-tip { background: #12161a !important; }
    .ops-page.light-mode .leaflet-popup-tip { background: #ffffff !important; }
    
    .leaflet-zoom-box { border-color: #e8a000 !important; }
    .ops-page.light-mode .leaflet-zoom-box { border-color: #d48a00 !important; }
    
    .leaflet-control-zoom a {
      background: #12161a !important;
      color: #e8a000 !important;
      border-color: #222831 !important;
      border-radius: 0 !important;
    }
    .ops-page.light-mode .leaflet-control-zoom a {
      background: #ffffff !important;
      color: #d48a00 !important;
      border-color: #e5e5ea !important;
    }
    
    .leaflet-control-zoom a:hover { background: #181d22 !important; }
    .ops-page.light-mode .leaflet-control-zoom a:hover { background: #f2f2f7 !important; }
  `
}

function makeCameraIcon(streaming: boolean, hasAlert: boolean) {
  const color = hasAlert ? '#d93a3a' : streaming ? '#2db55d' : '#78899a'
  const label = hasAlert ? '!' : streaming ? '▶' : '✕'
  const ring = streaming || hasAlert
    ? `<div style="position:absolute;inset:-5px;border-radius:50%;border:1px solid ${color};animation:opsmap-pulse 1.8s ease-out infinite;opacity:0.6;"></div>`
    : ''
  return L.divIcon({
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -16],
    html: `<div style="width:24px;height:24px;position:relative;display:flex;align-items:center;justify-content:center;">
      ${ring}
      <div style="
        width:20px;height:20px;
        background:#12161a;
        border:1.5px solid ${color};
        display:flex;align-items:center;justify-content:center;
        position:relative;z-index:1;
        box-shadow:0 0 8px ${color}44;
      ">
        <span style="font-size:12px;color:${color};font-family:monospace;font-weight:700;">${label}</span>
      </div>
    </div>`,
  })
}

function JourneyTrail({ points, color }: { points: [number, number][]; color: string }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    const glow = L.polyline(points, { color, weight: 10, opacity: 0.12, lineJoin: 'round', lineCap: 'round' }).addTo(map)
    const trail = L.polyline(points, { color, weight: 2, opacity: 0.85, lineJoin: 'round', lineCap: 'round' }).addTo(map)
    const dashed = L.polyline(points, {
      color: '#fff', weight: 1, opacity: 0.5,
      dashArray: '8 16', lineJoin: 'round', lineCap: 'round',
    }).addTo(map)
    const el = (dashed as any)._path as SVGPathElement | undefined
    if (el) el.classList.add('opsmap-trail-anim')
    return () => { glow.remove(); trail.remove(); dashed.remove() }
  }, [map, JSON.stringify(points), color])
  return null
}

function FitAll({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) { map.setView(points[0], 15); return }
    map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 15, animate: false })
  }, [map, JSON.stringify(points)])
  return null
}

function PlateTrailLayer({ trail }: { trail: PlateTrailPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (trail.length === 0) return
    const layers: L.Layer[] = []

    trail.forEach((pt, i) => {
      const icon = L.divIcon({
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -18],
        html: `<div style="width:28px;height:28px;background:#e8a000;border:2px solid #0a0c0e;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:13px;font-weight:900;color:#0a0c0e;box-shadow:0 0 14px rgba(232,160,0,0.7);">${i + 1}</div>`,
      })
      const m = L.marker([pt.lat, pt.lng], { icon }).bindPopup(
        `<div style="font-family:'IBM Plex Mono',monospace;min-width:140px">
          <p style="color:#e8a000;font-weight:800;font-size:13px;margin:0 0 5px;text-transform:uppercase;letter-spacing:.06em">#${i + 1} · ${pt.cameraName}</p>
          <p style="color:#c8d0d8;font-size:12px;margin:0 0 3px">${pt.count} sighting${pt.count !== 1 ? 's' : ''}</p>
          <p style="color:#78899a;font-size:13px;margin:0">${new Date(pt.timestamp).toLocaleTimeString('en-PK', { hour12: false })} · ${new Date(pt.timestamp).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}</p>
        </div>`
      ).addTo(map)
      layers.push(m)
    })

    if (trail.length >= 2) {
      const pts = trail.map(p => [p.lat, p.lng] as [number, number])
      const glow  = L.polyline(pts, { color: '#e8a000', weight: 10, opacity: 0.12, lineJoin: 'round' }).addTo(map)
      const line  = L.polyline(pts, { color: '#e8a000', weight: 2.5, opacity: 0.9,  lineJoin: 'round' }).addTo(map)
      const dash  = L.polyline(pts, { color: '#fff',    weight: 1,   opacity: 0.45, lineJoin: 'round', dashArray: '8 16' }).addTo(map)
      const el = (dash as any)._path as SVGPathElement | undefined
      if (el) el.classList.add('opsmap-trail-anim')
      layers.push(glow, line, dash)
    }

    const pts = trail.map(p => [p.lat, p.lng] as [number, number])
    if (pts.length === 1) map.setView(pts[0], 15, { animate: true })
    else map.fitBounds(L.latLngBounds(pts), { padding: [70, 70], maxZoom: 15, animate: true })

    return () => { layers.forEach(l => l.remove()) }
  }, [map, JSON.stringify(trail)])
  return null
}

export default function OpsMap({ cameras, journeys, plateTrail = [], isLightMode = false }: { cameras: Camera[]; journeys: Journey[]; plateTrail?: PlateTrailPoint[]; isLightMode?: boolean }) {
  useEffect(() => { injectStyles() }, [])

  const camerasWithGps = cameras.filter(c => c.lat != null && c.lng != null)
  const cameraPoints: [number, number][] = camerasWithGps.map(c => [c.lat!, c.lng!])
  const center: [number, number] = cameraPoints.length > 0
    ? cameraPoints[Math.floor(cameraPoints.length / 2)]
    : [30.3753, 69.3451]

  return (
    <MapContainer
      center={center}
      zoom={cameraPoints.length === 0 ? 6 : 13}
      style={{ width: '100%', height: '100%' }}
      zoomControl
      attributionControl={false}
    >
      <TileLayer
        key={isLightMode ? 'light' : 'dark'}
        url={isLightMode 
          ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
        subdomains="abcd"
        maxZoom={20}
      />
      {plateTrail.length === 0 && <FitAll points={cameraPoints} />}
      <PlateTrailLayer trail={plateTrail} />
      {camerasWithGps.map(cam => (
        <Marker key={cam.id} position={[cam.lat!, cam.lng!]} icon={makeCameraIcon(cam.streaming ?? false, false)}>
          <Popup minWidth={180}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", padding: '4px 0' }}>
              <p style={{ fontWeight: 700, fontSize: 11, color: '#e8a000', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {cam.name}
              </p>
              {cam.zone && (
                <p style={{ fontSize: 10, color: '#78899a', margin: '0 0 4px' }}>{cam.zone}</p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                  color: cam.streaming ? '#2db55d' : '#d93a3a',
                  padding: '1px 6px', border: `1px solid ${cam.streaming ? '#2db55d44' : '#d93a3a44'}`,
                }}>
                  {cam.streaming ? 'LIVE' : 'OFFLN'}
                </span>
                {cam.lat != null && (
                  <span style={{ fontSize: 9, color: '#3d4f5e' }}>
                    {cam.lat.toFixed(6)}, {cam.lng!.toFixed(6)}
                  </span>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      <div style={{
        position: 'absolute', bottom: 6, right: 10, zIndex: 800,
        fontSize: 8, color: '#3d4f5e', pointerEvents: 'none',
        fontFamily: 'monospace',
      }}>
        © CartoDB © OpenStreetMap
      </div>
    </MapContainer>
  )
}
