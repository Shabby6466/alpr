'use client'
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

interface Sighting {
  id: string
  cameraId?: string
  cameraName?: string
  zone?: string
  lat?: number
  lng?: number
  seenAt: string
  thumbnailBase64?: string
  confidence: number
}

// Colour sequence: start=blue, mid=orange, end=green
function pinColor(index: number, total: number) {
  if (index === 0) return { bg: '#007AFF', shadow: 'rgba(0,122,255,0.5)' }
  if (index === total - 1) return { bg: '#30D158', shadow: 'rgba(48,209,88,0.5)' }
  return { bg: '#FF9500', shadow: 'rgba(255,149,0,0.5)' }
}

function makeIcon(index: number, total: number) {
  const { bg, shadow } = pinColor(index, total)
  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
    html: `
      <div style="
        width:36px; height:36px; position:relative; cursor:pointer;
      ">
        <div style="
          width:36px; height:36px; border-radius:50% 50% 50% 0;
          transform:rotate(-45deg); background:${bg};
          box-shadow: 0 0 0 4px ${shadow}, 0 4px 16px ${shadow};
          display:flex; align-items:center; justify-content:center;
        ">
          <span style="
            transform:rotate(45deg); color:#fff;
            font-size:13px; font-weight:900; font-family:system-ui;
            line-height:1;
          ">${index + 1}</span>
        </div>
      </div>`,
  })
}

function AnimatedTrail({ points }: { points: [number, number][] }) {
  const map = useMap()
  const layerRef = useRef<L.Polyline | null>(null)
  const animRef = useRef<L.Polyline | null>(null)

  useEffect(() => {
    if (points.length < 2) return

    // Glow base line
    const glow = L.polyline(points, {
      color: '#007AFF',
      weight: 10,
      opacity: 0.15,
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(map)

    // Solid trail
    const trail = L.polyline(points, {
      color: '#007AFF',
      weight: 3,
      opacity: 0.9,
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(map)

    // Animated dashed overlay — "moving ants" effect
    const dashed = L.polyline(points, {
      color: '#fff',
      weight: 2,
      opacity: 0.7,
      dashArray: '12 18',
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(map)

    // Animate the dashed line via SVG stroke-dashoffset
    const el = (dashed as any)._path as SVGPathElement | undefined
    if (el) {
      el.style.animation = 'none'
      el.style.strokeDashoffset = '0'
      // Use a CSS custom animation injected once
      if (!document.getElementById('journey-trail-style')) {
        const s = document.createElement('style')
        s.id = 'journey-trail-style'
        s.textContent = `
          @keyframes dashMove {
            to { stroke-dashoffset: -120; }
          }
          .leaflet-interactive.journey-animated {
            animation: dashMove 1.6s linear infinite;
          }
        `
        document.head.appendChild(s)
      }
      el.classList.add('journey-animated')
    }

    layerRef.current = trail
    animRef.current = dashed

    return () => {
      glow.remove()
      trail.remove()
      dashed.remove()
    }
  }, [map, JSON.stringify(points)])

  return null
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 15)
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 16 })
    }
  }, [map, JSON.stringify(points)])
  return null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function JourneyMap({ sightings, plateText }: { sightings: Sighting[]; plateText: string }) {
  // Only plot sightings that have GPS
  const gps = sightings
    .filter(s => s.lat != null && s.lng != null)
    .sort((a, b) => new Date(a.seenAt).getTime() - new Date(b.seenAt).getTime())

  if (gps.length === 0) return null

  const points: [number, number][] = gps.map(s => [s.lat!, s.lng!])
  const center = points[Math.floor(points.length / 2)]

  return (
    <div className="relative w-full overflow-hidden" style={{ borderRadius: 16, height: 360 }}>
      {/* Map */}
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: '100%', height: '100%', background: '#1a1a2e' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        <FitBounds points={points} />
        <AnimatedTrail points={points} />

        {gps.map((s, i) => (
          <Marker key={s.id} position={[s.lat!, s.lng!]} icon={makeIcon(i, gps.length)}>
            <Popup
              minWidth={200}
              className="journey-popup"
            >
              <div style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                padding: '2px 0',
                minWidth: 200,
              }}>
                {s.thumbnailBase64 && (
                  <img
                    src={`data:image/jpeg;base64,${s.thumbnailBase64}`}
                    alt="plate"
                    style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
                  />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 900, fontSize: 13,
                    background: '#1D1D1F', color: '#FFD60A',
                    padding: '2px 8px', borderRadius: 6,
                  }}>{plateText}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: '#30D158',
                    background: 'rgba(48,209,88,0.12)', padding: '2px 6px', borderRadius: 20,
                  }}>{Math.round(s.confidence * 100)}%</span>
                </div>
                <p style={{ margin: '2px 0', fontWeight: 700, fontSize: 13, color: '#1D1D1F' }}>
                  {s.cameraName ?? s.cameraId ?? 'Camera'}
                </p>
                {s.zone && (
                  <p style={{ margin: '2px 0', fontSize: 11, color: '#007AFF', fontWeight: 600 }}>
                    📍 {s.zone}
                  </p>
                )}
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#8E8E93', fontWeight: 500 }}>
                  {formatTime(s.seenAt)}
                  <span style={{ margin: '0 4px', color: '#C7C7CC' }}>·</span>
                  {formatDate(s.seenAt)}
                </p>
                {s.lat != null && (
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#C7C7CC' }}>
                    {s.lat.toFixed(5)}, {s.lng!.toFixed(5)}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Overlay: plate badge + camera count */}
      <div style={{
        position: 'absolute', top: 14, left: 14, zIndex: 800,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        <div style={{
          background: 'rgba(10,10,20,0.75)',
          backdropFilter: 'blur(12px)',
          borderRadius: 10, padding: '6px 12px',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            fontFamily: 'ui-monospace, monospace',
            fontWeight: 900, fontSize: 14,
            color: '#FFD60A', letterSpacing: '0.05em',
          }}>{plateText}</span>
          <span style={{
            width: 1, height: 14, background: 'rgba(255,255,255,0.15)',
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
            {gps.length} sighting{gps.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 14, left: 14, zIndex: 800,
        display: 'flex', gap: 8, pointerEvents: 'none',
      }}>
        {[
          { color: '#007AFF', label: 'Entry' },
          { color: '#FF9500', label: 'Transit' },
          { color: '#30D158', label: 'Last seen' },
        ].map(({ color, label }) => (
          <div key={label} style={{
            background: 'rgba(10,10,20,0.75)',
            backdropFilter: 'blur(12px)',
            borderRadius: 20, padding: '4px 10px',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'block' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Attribution */}
      <div style={{
        position: 'absolute', bottom: 6, right: 10, zIndex: 800,
        fontSize: 9, color: 'rgba(255,255,255,0.25)', pointerEvents: 'none',
      }}>
        © CartoDB © OpenStreetMap
      </div>
    </div>
  )
}
