'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Camera, Journey } from '@/types'

const TRAIL_COLORS = ['#007AFF', '#FF3B30', '#5856D6', '#FF9500', '#30D158', '#FF2D55', '#AC8E68']

function injectStyles() {
  if (typeof document === 'undefined' || document.getElementById('dashmap-styles')) return
  const s = document.createElement('style')
  s.id = 'dashmap-styles'
  s.textContent = `
    @keyframes dashmap-pulse {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(2.6); opacity: 0; }
    }
    @keyframes dashmap-move {
      to { stroke-dashoffset: -120; }
    }
    .dashmap-trail-anim {
      animation: dashmap-move 1.8s linear infinite;
    }
  `
  document.head.appendChild(s)
}

function makeCameraIcon(streaming: boolean) {
  const ring = streaming
    ? `<div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid #30D158;animation:dashmap-pulse 2s ease-out infinite;"></div>`
    : ''
  const borderColor = streaming ? '#30D158' : '#E5E5EA'
  const iconColor = streaming ? '#30D158' : '#8E8E93'

  return L.divIcon({
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
    html: `<div style="width:40px;height:40px;position:relative;display:flex;align-items:center;justify-content:center;">
      ${ring}
      <div style="
        width:34px;height:34px;border-radius:50%;
        background:white;
        box-shadow:0 2px 10px rgba(0,0,0,0.12),0 0 0 2.5px ${borderColor};
        display:flex;align-items:center;justify-content:center;
        position:relative;z-index:1;
      ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 7l-7 5 7 5V7z"/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      </div>
    </div>`,
  })
}

function JourneyTrail({ points, color }: { points: [number, number][]; color: string }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    const glow = L.polyline(points, {
      color, weight: 12, opacity: 0.08, lineJoin: 'round', lineCap: 'round',
    }).addTo(map)
    const trail = L.polyline(points, {
      color, weight: 2.5, opacity: 0.8, lineJoin: 'round', lineCap: 'round',
    }).addTo(map)
    const dashed = L.polyline(points, {
      color: '#fff', weight: 1.5, opacity: 0.65,
      dashArray: '10 18', lineJoin: 'round', lineCap: 'round',
    }).addTo(map)
    const el = (dashed as any)._path as SVGPathElement | undefined
    if (el) el.classList.add('dashmap-trail-anim')
    return () => { glow.remove(); trail.remove(); dashed.remove() }
  }, [map, JSON.stringify(points), color])
  return null
}

function FitAll({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) { map.setView(points[0], 15); return }
    map.fitBounds(L.latLngBounds(points), { padding: [64, 64], maxZoom: 16, animate: false })
  }, [map, JSON.stringify(points)])
  return null
}

export default function DashboardMap({
  cameras,
  journeys,
}: {
  cameras: Camera[]
  journeys: Journey[]
}) {
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
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />

      <FitAll points={cameraPoints} />

      {journeys.map((j, idx) => {
        const pts = (j.sightings ?? [])
          .filter(s => s.lat != null && s.lng != null)
          .sort((a, b) => new Date(a.seenAt).getTime() - new Date(b.seenAt).getTime())
          .map(s => [s.lat!, s.lng!] as [number, number])
        if (pts.length < 2) return null
        return (
          <JourneyTrail
            key={j.id}
            points={pts}
            color={TRAIL_COLORS[idx % TRAIL_COLORS.length]}
          />
        )
      })}

      {camerasWithGps.map(cam => (
        <Marker
          key={cam.id}
          position={[cam.lat!, cam.lng!]}
          icon={makeCameraIcon(cam.streaming ?? false)}
        >
          <Popup minWidth={190}>
            <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '2px 0' }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#1D1D1F', margin: '0 0 5px' }}>
                {cam.name}
              </p>
              {cam.zone && (
                <p style={{ fontSize: 11, color: '#007AFF', fontWeight: 600, margin: '0 0 5px' }}>
                  📍 {cam.zone}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: cam.streaming ? '#30D158' : '#8E8E93',
                  background: cam.streaming ? 'rgba(48,209,88,0.12)' : 'rgba(142,142,147,0.08)',
                  padding: '2px 8px', borderRadius: 20,
                }}>
                  {cam.streaming ? '● Live' : '○ Offline'}
                </span>
                {cam.lat != null && (
                  <span style={{ fontSize: 10, color: '#AEAEB2' }}>
                    {cam.lat.toFixed(6)}, {cam.lng!.toFixed(6)}
                  </span>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Attribution */}
      <div style={{
        position: 'absolute', bottom: 6, right: 10, zIndex: 800,
        fontSize: 9, color: 'rgba(0,0,0,0.28)', pointerEvents: 'none',
        fontFamily: 'system-ui',
      }}>
        © CartoDB © OpenStreetMap
      </div>
    </MapContainer>
  )
}
