'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import useSWR from 'swr'
import { useSSE } from '@/lib/useSSE'
import { getVideo } from '@/lib/cameraVideoStore'
import { Camera, Journey, Alert, WatchlistEntry, DetectionEvent } from '@/types'

const OpsMap = dynamic(() => import('@/components/ui/OpsMap'), { ssr: false })

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ─── CSS injection ───────────────────────────────────────────────────────────

function injectDashStyles() {
  if (typeof document === 'undefined' || document.getElementById('ops-dash-styles')) return
  const s = document.createElement('style')
  s.id = 'ops-dash-styles'
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

    .ops-page { font-family: 'IBM Plex Mono', 'Share Tech Mono', 'Courier New', monospace; }

    @keyframes led-pulse  { 0%,100%{opacity:1} 50%{opacity:0.2} }
    @keyframes led-slow   { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes ticker-scroll { from{transform:translateX(100vw)} to{transform:translateX(-100%)} }
    @keyframes scanline-sweep {
      0%   { top:-4px; opacity:0.6; }
      100% { top:100%;  opacity:0; }
    }

    .led-green  { animation: led-pulse 1.1s ease-in-out infinite; }
    .led-amber  { animation: led-pulse 0.8s ease-in-out infinite; }
    .led-slow   { animation: led-slow  2s   ease-in-out infinite; }
    .ticker-text { animation: ticker-scroll 40s linear infinite; white-space: nowrap; }
    .scanline {
      position:absolute; left:0; right:0; height:3px;
      background:linear-gradient(transparent, rgba(45,181,93,0.6), transparent);
      animation: scanline-sweep 2.2s linear infinite;
      pointer-events:none;
    }

    :root { color-scheme: dark; }

    .ops-page ::-webkit-scrollbar { width:3px; height:3px; }
    .ops-page ::-webkit-scrollbar-track { background:#0e1114; }
    .ops-page ::-webkit-scrollbar-thumb { background:#2e3740; }

    .ops-panel-hdr {
      font-size:10px; font-weight:700; letter-spacing:0.14em;
      text-transform:uppercase; color:#78899a;
      padding:8px 12px; background:#0e1114;
      border-bottom:1px solid #222831;
      display:flex; align-items:center; gap:8px;
    }
    .ops-section-title {
      font-size:10px; font-weight:700; letter-spacing:0.12em;
      text-transform:uppercase; color:#78899a;
      padding:7px 12px 6px;
      border-bottom:1px solid #181d22;
      display:flex; align-items:center; gap:6px;
    }
    .ops-stat-cell {
      flex:1; padding:10px 10px; display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      border-right:1px solid #222831;
    }
    .ops-stat-cell:last-child { border-right:none; }
    .ops-stat-val { font-size:28px; font-weight:700; line-height:1; }
    .ops-stat-label { font-size:9px; letter-spacing:0.1em; color:#78899a; margin-top:3px; text-transform:uppercase; }

    .ops-feed-row {
      padding:7px 12px; border-bottom:1px solid #181d22;
      cursor:pointer; transition:background 0.1s;
      border-left:2px solid transparent;
      position:relative;
    }
    .ops-feed-row:hover { background:#181d22; }
    .ops-feed-row.selected { background:#181d22; border-left-color:#e8a000; }
    .ops-feed-row.alert-row  { border-left-color:#d93a3a; }
    .ops-feed-row.watch-row  { border-left-color:#e8a000; }
    .ops-feed-row.clear-row  { border-left-color:#3d4f5e; }

    .ops-plate {
      font-size:13px; font-weight:700; letter-spacing:0.12em;
      display:inline-block;
    }
    .plate-alert { color:#d93a3a; }
    .plate-watch { color:#e8a000; }
    .plate-clear { color:#c8d0d8; }

    .ops-badge {
      font-size:8px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
      padding:2px 6px; border:1px solid;
    }
    .badge-alert  { color:#d93a3a; border-color:#d93a3a44; background:rgba(217,58,58,0.1); }
    .badge-watch  { color:#e8a000; border-color:#e8a00044; background:rgba(232,160,0,0.08); }
    .badge-clear  { color:#78899a; border-color:#3d4f5e;   background:transparent; }
    .badge-live   { color:#2db55d; border-color:#2db55d44; background:rgba(45,181,93,0.08); }
    .badge-offln  { color:#d93a3a; border-color:#d93a3a44; background:rgba(217,58,58,0.08); }
    .badge-amber  { color:#e8a000; border-color:#e8a00044; background:rgba(232,160,0,0.08); }

    .ops-tab { font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
      padding:7px 14px; cursor:pointer; border:none; background:none;
      color:#78899a; border-bottom:2px solid transparent; transition:all 0.15s; white-space:nowrap; }
    .ops-tab:hover { color:#c8d0d8; }
    .ops-tab.active { color:#e8a000; border-bottom-color:#e8a000; }

    .ops-btn {
      font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
      padding:5px 12px; cursor:pointer; border:1px solid; transition:all 0.15s; font-family:inherit;
    }
    .ops-btn-amber { color:#e8a000; border-color:#e8a00055; background:rgba(232,160,0,0.06); }
    .ops-btn-amber:hover { background:rgba(232,160,0,0.14); }
    .ops-btn-red   { color:#d93a3a; border-color:#d93a3a55; background:rgba(217,58,58,0.06); }
    .ops-btn-red:hover { background:rgba(217,58,58,0.14); }
    .ops-btn-blue  { color:#2f7fc1; border-color:#2f7fc155; background:rgba(47,127,193,0.06); }
    .ops-btn-blue:hover { background:rgba(47,127,193,0.14); }

    .face-tile {
      aspect-ratio:1; background:#0e1114; border:1px solid #222831;
      position:relative; overflow:hidden; cursor:pointer;
      transition:border-color 0.15s;
    }
    .face-tile:hover { border-color:#e8a000; }
    .face-tile.flagged { border-color:#d93a3a55; }
    .face-tile.matched { border-color:#2db55d55; }

    .conf-bar { height:3px; background:#222831; margin-top:3px; }
    .conf-bar-fill { height:100%; transition:width 0.3s; }
    .conf-high  { background:#2db55d; }
    .conf-mid   { background:#e8a000; }
    .conf-low   { background:#d93a3a; }

    .health-row {
      display:flex; align-items:center; justify-content:space-between;
      padding:7px 12px; border-bottom:1px solid #181d22; font-size:10px;
    }
    .health-nom  { color:#2db55d; }
    .health-warn { color:#e8a000; }
    .health-err  { color:#d93a3a; }

    .ops-input {
      background:#0e1114; border:1px solid #222831; color:#c8d0d8;
      font-family:inherit; font-size:9px; padding:4px 8px; outline:none;
      letter-spacing:0.05em; text-transform:uppercase;
    }
    .ops-input:focus { border-color:#e8a000; }
    .ops-input::placeholder { color:#3d4f5e; }
  `
  document.head.appendChild(s)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function led(color: string, cls = '') {
  return (
    <span
      className={cls}
      style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: color, flexShrink: 0,
        boxShadow: `0 0 6px ${color}bb`,
      }}
    />
  )
}

function confClass(v: number) {
  if (v >= 0.96) return 'conf-high'
  if (v >= 0.9)  return 'conf-mid'
  return 'conf-low'
}

function eventStatus(ev: DetectionEvent, alerts: Alert[]) {
  if (alerts.some(a => a.plateText === ev.plateText && !a.acknowledged)) return 'alert'
  return 'clear'
}

// ─── Digital Clock ────────────────────────────────────────────────────────────

function Clock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-PK', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span style={{ color: '#e8a000', fontSize: 15, fontWeight: 700, letterSpacing: '0.08em', minWidth: 80 }}>
      {time} PKT
    </span>
  )
}

// ─── Corner Brackets ─────────────────────────────────────────────────────────

function Brackets({ color = '#2db55d', size = 8 }: { color?: string; size?: number }) {
  return (
    <>
      <div style={{ position: 'absolute', top: 4, left: 4, width: size, height: size, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <div style={{ position: 'absolute', top: 4, right: 4, width: size, height: size, borderTop: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
      <div style={{ position: 'absolute', bottom: 4, left: 4, width: size, height: size, borderBottom: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <div style={{ position: 'absolute', bottom: 4, right: 4, width: size, height: size, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
    </>
  )
}

// ─── Camera Tile ─────────────────────────────────────────────────────────────

interface LocalDetection {
  plateText: string
  confidence: number
  thumbnailBase64: string | null
  timestamp: string
}

function CameraFeed({ cam, recentDetections, C }: {
  cam: Camera
  recentDetections: DetectionEvent[]
  C: Record<string, string>
}) {
  const [testVideoUrl, setTestVideoUrl] = useState<string | null>(null)
  const [testFilename, setTestFilename] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [localDetections, setLocalDetections] = useState<LocalDetection[]>([])
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const { cameraId, cameraName, plateText, confidence, thumbnailBase64, timestamp } = (e as CustomEvent).detail
      if (cameraId !== cam.id && cameraName !== cam.name) return
      setLocalDetections(prev => [{ plateText, confidence, thumbnailBase64, timestamp }, ...prev].slice(0, 50))
    }
    window.addEventListener('mits-detection', handler)
    return () => window.removeEventListener('mits-detection', handler)
  }, [cam.id, cam.name])

  useEffect(() => {
    getVideo(cam.id).then(entry => {
      if (entry) {
        const url = URL.createObjectURL(entry.blob)
        objectUrlRef.current = url
        setTestVideoUrl(url)
        setTestFilename(entry.filename)
      }
    })
    const onUpdate = () => {
      getVideo(cam.id).then(entry => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        if (entry) {
          const url = URL.createObjectURL(entry.blob)
          objectUrlRef.current = url
          setTestVideoUrl(url)
          setTestFilename(entry.filename)
        } else {
          objectUrlRef.current = null
          setTestVideoUrl(null)
          setTestFilename(null)
        }
      })
    }
    window.addEventListener('camera-video-updated', onUpdate)
    return () => {
      window.removeEventListener('camera-video-updated', onUpdate)
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [cam.id])

  // local detections (from background processor) take priority — they never deduplicate
  const displayDetections: Array<{ plateText: string; confidence: number; timestamp: string }> =
    localDetections.length > 0 ? localDetections : recentDetections
  const latestPlate = displayDetections[0]
  const isHttpStream = cam.url?.startsWith('http') && !cam.url?.endsWith('.html')
  const canEmbedStream = cam.streaming && isHttpStream && !imgError
  const statusColor = testVideoUrl ? C.blue : cam.streaming ? C.green : C.red

  return (
    <div style={{
      background: C.bg2,
      border: `1px solid ${testVideoUrl ? C.blue + '55' : cam.streaming ? C.border : C.red + '44'}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
      minHeight: 0,
    }}>
      {/* Camera header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
        background: C.bg1, borderBottom: `1px solid ${C.border}`, flexShrink: 0,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: statusColor,
          boxShadow: `0 0 4px ${statusColor}`,
          animation: 'led-slow 2s ease-in-out infinite',
          display: 'inline-block',
        }} />
        <span style={{ fontSize: 9, color: C.amber, fontWeight: 700, letterSpacing: '0.08em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cam.name}
        </span>
        {testVideoUrl ? (
          <span style={{
            fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', padding: '1px 5px',
            border: `1px solid ${C.blue}55`, color: C.blue,
            background: 'rgba(47,127,193,0.1)',
          }}>TEST LOOP</span>
        ) : (
          <span style={{
            fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', padding: '1px 5px',
            border: `1px solid ${cam.streaming ? C.green + '55' : C.red + '55'}`,
            color: cam.streaming ? C.green : C.red,
            background: cam.streaming ? 'rgba(45,181,93,0.08)' : 'rgba(217,58,58,0.08)',
          }}>
            {cam.streaming ? 'LIVE' : 'OFFLINE'}
          </span>
        )}
      </div>

      {/* Video / stream area */}
      <div style={{ flex: 1, position: 'relative', minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#06080a', overflow: 'hidden' }}>

        {testVideoUrl ? (
          /* Test video loop — visible playback in this tile */
          <video
            src={testVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : canEmbedStream ? (
          <img
            src={cam.url}
            alt={cam.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 10 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={cam.streaming ? C.txt3 : C.red + '88'} strokeWidth="1.2">
              <path d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.9L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
            </svg>
            {cam.streaming ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: C.txt3, letterSpacing: '0.08em' }}>STREAM ACTIVE</div>
                <div style={{ fontSize: 7, color: C.txt3 + '88', marginTop: 2 }}>RTSP — no browser preview</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: C.red, fontWeight: 700, letterSpacing: '0.1em' }}>CAMERA OFFLINE</div>
                {cam.zone && <div style={{ fontSize: 7, color: C.txt3, marginTop: 2 }}>{cam.zone}</div>}
                <div style={{ fontSize: 7, color: C.txt3 + '88', marginTop: 1 }}>No signal from device</div>
              </div>
            )}
          </div>
        )}

        {/* Latest plate overlay */}
        {latestPlate && (
          <div style={{
            position: 'absolute', bottom: 4, left: 4, right: 4,
            background: 'rgba(10,12,14,0.88)', border: `1px solid ${C.amber}44`,
            padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 9, color: C.amber, fontWeight: 700, letterSpacing: '0.1em', flex: 1 }}>{latestPlate.plateText}</span>
            <span style={{ fontSize: 7, color: C.txt3 }}>{Math.round(latestPlate.confidence * 100)}%</span>
            <span style={{ fontSize: 7, color: C.txt3 }}>{new Date(latestPlate.timestamp).toLocaleTimeString('en-PK', { hour12: false })}</span>
          </div>
        )}

        {/* Test video filename tag */}
        {testFilename && (
          <div style={{
            position: 'absolute', top: 4, left: 4,
            background: 'rgba(47,127,193,0.85)', padding: '1px 5px',
            fontSize: 7, color: '#fff', fontWeight: 700, letterSpacing: '0.08em',
            maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            ▶ {testFilename}
          </div>
        )}

        <Brackets color={testVideoUrl ? C.blue + '88' : cam.streaming ? C.green + '66' : C.red + '44'} size={7} />
      </div>

      {/* Detection log — every hit, including loop repeats */}
      {displayDetections.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}`, maxHeight: 120, overflowY: 'auto', flexShrink: 0 }}>
          {displayDetections.slice(0, 20).map((ev, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 9, color: C.amber, fontWeight: 700, letterSpacing: '0.08em', flex: 1 }}>{ev.plateText}</span>
              <span style={{ fontSize: 8, color: C.txt3 }}>{Math.round(ev.confidence * 100)}%</span>
              <span style={{ fontSize: 8, color: C.txt3 }}>{new Date(ev.timestamp).toLocaleTimeString('en-PK', { hour12: false })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CameraGrid({ cameras, recentEvents, C }: { cameras: Camera[]; recentEvents: DetectionEvent[]; C: Record<string, string> }) {
  if (cameras.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.txt3} strokeWidth="1.2">
          <path d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.9L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
        </svg>
        <div style={{ fontSize: 9, color: C.txt3, letterSpacing: '0.1em' }}>NO CAMERAS CONFIGURED</div>
        <Link href="/admin/cameras" style={{ textDecoration: 'none' }}>
          <button style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 12px',
            border: `1px solid ${C.amber}55`, color: C.amber, background: 'rgba(232,160,0,0.06)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>+ ADD CAMERAS</button>
        </Link>
      </div>
    )
  }

  const cols = cameras.length <= 2 ? 1 : cameras.length <= 4 ? 2 : cameras.length <= 9 ? 3 : 4

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 5, height: '100%' }}>
        {cameras.map(cam => {
          const camEvents = recentEvents
            .filter(e => e.cameraId === cam.id || e.cameraName === cam.name)
            .slice(0, 5)
          return <CameraFeed key={cam.id} cam={cam} recentDetections={camEvents} C={C} />
        })}
      </div>
    </div>
  )
}

// ─── Incidents View ───────────────────────────────────────────────────────────

function IncidentsView({ alerts, events, C }: { alerts: Alert[]; events: DetectionEvent[]; C: Record<string, string> }) {
  const unacked = alerts.filter(a => !a.acknowledged)
  const recentWithAlerts = events.filter(e => alerts.some(a => a.plateText === e.plateText))

  if (unacked.length === 0 && recentWithAlerts.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 28, opacity: 0.3 }}>✓</span>
        <div style={{ fontSize: 9, color: C.green, letterSpacing: '0.1em', fontWeight: 700 }}>ALL CLEAR — NO ACTIVE INCIDENTS</div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: 8 }}>
      {/* Active alerts */}
      {unacked.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 8, color: C.red, fontWeight: 700, letterSpacing: '0.12em', padding: '4px 0', borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
            ⚠ ACTIVE ALERTS ({unacked.length})
          </div>
          {unacked.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
              borderBottom: `1px solid ${C.border}`, borderLeft: `2px solid ${C.red}`,
              background: 'rgba(217,58,58,0.05)', marginBottom: 3,
            }}>
              {a.thumbnailBase64 && (
                <img src={`data:image/jpeg;base64,${a.thumbnailBase64}`} alt="" style={{ width: 48, height: 32, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: C.red, fontWeight: 700, letterSpacing: '0.1em' }}>{a.plateText}</div>
                {a.reason && <div style={{ fontSize: 8, color: C.txt3, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</div>}
              </div>
              <span style={{ fontSize: 8, color: C.txt3, flexShrink: 0 }}>{new Date(a.timestamp).toLocaleTimeString('en-PK', { hour12: false })}</span>
            </div>
          ))}
        </div>
      )}

      {/* Events linked to alerts */}
      {recentWithAlerts.length > 0 && (
        <div>
          <div style={{ fontSize: 8, color: C.amber, fontWeight: 700, letterSpacing: '0.12em', padding: '4px 0', borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
            RELATED SIGHTINGS ({recentWithAlerts.length})
          </div>
          {recentWithAlerts.slice(0, 20).map((e, i) => (
            <div key={e.id ?? i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px',
              borderBottom: `1px solid ${C.border}`, borderLeft: `2px solid ${C.amber}`,
            }}>
              <span style={{ fontSize: 10, color: C.amber, fontWeight: 700, letterSpacing: '0.1em', flex: 1 }}>{e.plateText}</span>
              <span style={{ fontSize: 8, color: C.txt2 }}>{e.cameraName ?? e.source?.toUpperCase() ?? '—'}</span>
              <span style={{ fontSize: 8, color: C.txt3 }}>{Math.round(e.confidence * 100)}%</span>
              <span style={{ fontSize: 8, color: C.txt3 }}>{new Date(e.timestamp).toLocaleTimeString('en-PK', { hour12: false })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OpsDashboard() {
  useEffect(() => { injectDashStyles() }, [])

  // ── State
  const [feedFilter, setFeedFilter]     = useState<'ALL' | 'ALERT' | 'WATCH' | 'CLEAR'>('ALL')
  const [selectedEvent, setSelectedEvent] = useState<DetectionEvent | null>(null)
  const [centerView, setCenterView]     = useState<'MAP' | 'CAMERAS' | 'INCIDENTS'>('MAP')
  const [liveEvents, setLiveEvents]     = useState<DetectionEvent[]>([])
  const [liveAlerts, setLiveAlerts]     = useState<Alert[]>([])

  // ── Data
  const { data: camerasData = [] }    = useSWR<Camera[]>('/api/cameras', fetcher, { refreshInterval: 5000 })
  const { data: alertsData = [] }     = useSWR<Alert[]>('/api/alerts?acknowledged=false', fetcher, { refreshInterval: 5000 })
  const { data: watchlistData = [] }  = useSWR<WatchlistEntry[]>('/api/watchlist?activeOnly=true', fetcher, { refreshInterval: 10000 })
  const { data: journeysData }        = useSWR<any>('/api/journeys?status=active&limit=20', fetcher, { refreshInterval: 15000 })
  const { data: eventsData }          = useSWR<any>('/api/events?limit=80', fetcher, { refreshInterval: 30000 })
  const { data: faceData }            = useSWR<any>('/api/face-events?limit=18', fetcher, { refreshInterval: 10000 })

  const allAlerts: Alert[]          = [...liveAlerts, ...(Array.isArray(alertsData) ? alertsData : [])].filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i)
  const cameras: Camera[]           = camerasData
  const journeys: Journey[]         = journeysData?.data ?? []
  const recentEvents: DetectionEvent[] = liveEvents.length > 0 ? liveEvents : (eventsData?.data ?? [])
  const faceEvents: any[]           = faceData?.data ?? []

  // ── SSE
  useSSE<DetectionEvent>('/api/events/stream', ev =>
    setLiveEvents(p => [ev, ...p].slice(0, 100)))
  useSSE<Alert>('/api/alerts/stream', alert => {
    if (!alert.acknowledged) setLiveAlerts(p => [alert, ...p].slice(0, 50))
  })

  // ── Derived stats
  const today = new Date().toDateString()
  const todayCount    = recentEvents.filter(e => new Date(e.timestamp).toDateString() === today).length
  const streamingCount = cameras.filter(c => c.streaming).length
  const offlineCount   = cameras.filter(c => !c.streaming).length
  const alertCount     = allAlerts.filter(a => !a.acknowledged).length

  // ── Feed filtering
  const filteredEvents = recentEvents.filter(ev => {
    if (feedFilter === 'ALL')   return true
    if (feedFilter === 'ALERT') return allAlerts.some(a => a.plateText === ev.plateText && !a.acknowledged)
    if (feedFilter === 'CLEAR') return !allAlerts.some(a => a.plateText === ev.plateText)
    return false
  })

  // ── Ticker content
  const tickerItems = [
    ...recentEvents.slice(0, 6).map(e =>
      `${e.plateText}  ${Math.round(e.confidence * 100)}% · ${e.cameraName ?? e.source?.toUpperCase() ?? 'MANUAL'}  |  `
    ),
    ...allAlerts.slice(0, 3).map(a =>
      `⚠  ${a.plateText} WATCHLIST HIT ${a.reason ? '— ' + a.reason : ''}  |  `
    ),
    `MITS ALPR: ${todayCount} reads today  |  `,
    `CAMERAS: ${streamingCount} LIVE · ${offlineCount} OFFLINE  |  `,
  ]

  const C = { bg0: '#0a0c0e', bg1: '#0e1114', bg2: '#12161a', bg3: '#181d22', amber: '#e8a000', green: '#2db55d', red: '#d93a3a', blue: '#2f7fc1', txt: '#c8d0d8', txt2: '#78899a', txt3: '#3d4f5e', border: '#222831' }

  return (
    <div
      className="ops-page"
      style={{
        height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        background: C.bg0, color: C.txt,
      }}
    >
      {/* ─── TOP BAR ────────────────────────────────────────────────────────── */}
      <div style={{ height: 52, background: C.bg1, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'stretch', flexShrink: 0, zIndex: 100 }}>

        {/* Left: brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 18, borderRight: `1px solid ${C.border}`, flexShrink: 0 }}>
          <img src="/Logo.png" alt="MITS" style={{ height: 32, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <img src="/M.I.T.S.png" alt="M.I.T.S." style={{ height: 14, width: 'auto', objectFit: 'contain' }} />
            <div style={{ fontSize: 8, color: C.txt3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Multiple Identity Tracking System</div>
          </div>
        </div>

        {/* Center: spacer */}
        <div style={{ flex: 1 }} />

        {/* Right: cameras status + clock + admin */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingRight: 16, paddingLeft: 16, borderLeft: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {led(cameras.length > 0 ? C.green : C.txt3, 'led-slow')}
            <span style={{ fontSize: 10, color: C.txt2, letterSpacing: '0.08em' }}>{streamingCount}/{cameras.length} CAM</span>
          </div>
          <Link href="/admin/cameras" style={{ textDecoration: 'none' }}>
            <button className="ops-btn ops-btn-amber">→ ADMIN PANEL</button>
          </Link>
          <Clock />
        </div>
      </div>

      {/* ─── MAIN 3-COLUMN GRID ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '380px 1fr 380px', overflow: 'hidden', minHeight: 0 }}>

        {/* ══════════ LEFT PANEL — ALPR ══════════ */}
        <div style={{ background: C.bg1, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Panel header */}
          <div className="ops-panel-hdr">
            {led(C.amber, 'led-slow')} ALPR SYSTEM
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {[
              { label: 'READS TODAY', val: todayCount, color: C.amber },
              { label: 'ACTIVE ALERTS', val: alertCount, color: alertCount > 0 ? C.red : C.txt2 },
              { label: 'WATCHLIST', val: watchlistData.length, color: C.amber },
            ].map(s => (
              <div key={s.label} className="ops-stat-cell">
                <div className="ops-stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="ops-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Live plate reads */}
          <div className="ops-section-title" style={{ flexShrink: 0 }}>
            {led(C.green, 'led-pulse')}
            LIVE PLATE READS
            <span style={{ marginLeft: 'auto', fontSize: 9, color: C.txt3 }}>{recentEvents.length} RECORDS</span>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {(['ALL', 'ALERT', 'WATCH', 'CLEAR'] as const).map(f => (
              <button key={f} className={`ops-tab${feedFilter === f ? ' active' : ''}`} style={{ flex: 1, padding: '5px 0' }} onClick={() => setFeedFilter(f)}>{f}</button>
            ))}
            <button className="ops-tab" style={{ padding: '5px 10px', color: C.red }} onClick={() => { setLiveEvents([]); setSelectedEvent(null) }}>CLR</button>
          </div>

          {/* Feed */}
          <div style={{ flex: selectedEvent ? '0 0 auto' : 1, overflowY: 'auto', maxHeight: selectedEvent ? 220 : undefined }}>
            {filteredEvents.length === 0 ? (
              <div style={{ padding: '20px 10px', textAlign: 'center', color: C.txt3, fontSize: 9 }}>NO RECORDS</div>
            ) : filteredEvents.map((ev, i) => {
              const status = eventStatus(ev, allAlerts)
              return (
                <div
                  key={ev.id ?? i}
                  className={`ops-feed-row ${status}-row${selectedEvent?.id === ev.id ? ' selected' : ''}`}
                  onClick={() => setSelectedEvent(prev => prev?.id === ev.id ? null : ev)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span className={`ops-plate plate-${status}`}>{ev.plateText}</span>
                    <span style={{ fontSize: 10, color: C.txt2 }}>{Math.round(ev.confidence * 100)}%</span>
                    <span className={`ops-badge badge-${status}`}>{status.toUpperCase()}</span>
                  </div>
                  <div style={{ marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: C.txt3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.cameraName ?? ev.source?.toUpperCase() ?? '—'}
                    </span>
                    <span style={{ fontSize: 10, color: C.txt3, flexShrink: 0 }}>
                      {new Date(ev.timestamp).toLocaleTimeString('en-PK', { hour12: false })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Vehicle detail panel */}
          {selectedEvent && (
            <div style={{ background: C.bg2, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div className="ops-section-title" style={{ justifyContent: 'space-between' }}>
                VEHICLE DETAIL
                <button style={{ background: 'none', border: 'none', color: C.txt3, cursor: 'pointer', fontSize: 10 }} onClick={() => setSelectedEvent(null)}>✕</button>
              </div>
              <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 10 }}>
                {[
                  ['PLATE',  selectedEvent.plateText],
                  ['CONF',   `${Math.round(selectedEvent.confidence * 100)}%`],
                  ['SOURCE', selectedEvent.source?.toUpperCase()],
                  ['CAMERA', selectedEvent.cameraName ?? '—'],
                  ['PERSON', selectedEvent.personName ?? '—'],
                  ['TIME',   new Date(selectedEvent.timestamp).toLocaleTimeString('en-PK', { hour12: false })],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ color: C.txt3, fontSize: 8, letterSpacing: '0.1em', marginBottom: 2 }}>{k}</div>
                    <div style={{ color: k === 'PLATE' ? C.amber : C.txt, fontWeight: k === 'PLATE' ? 700 : 500 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, padding: '6px 10px', borderTop: `1px solid ${C.border}` }}>
                <Link href="/admin/alerts" style={{ textDecoration: 'none' }}>
                  <button className="ops-btn ops-btn-amber" style={{ fontSize: 8 }}>VIEW EVENTS</button>
                </Link>
                <Link href="/admin/watchlist" style={{ textDecoration: 'none' }}>
                  <button className="ops-btn ops-btn-red" style={{ fontSize: 8 }}>WATCHLIST</button>
                </Link>
              </div>
            </div>
          )}

          {/* Camera list */}
          <div style={{ flexShrink: 0 }}>
            <div className="ops-section-title">
              {led(cameras.length > 0 ? C.green : C.txt3, 'led-slow')}
              ALPR CAMERAS
              <span style={{ marginLeft: 'auto', fontSize: 8 }}>
                <span style={{ color: C.green }}>{streamingCount} LIVE</span>
                {offlineCount > 0 && <span style={{ color: C.red, marginLeft: 4 }}>{offlineCount} OFFLN</span>}
              </span>
            </div>
            <div style={{ maxHeight: 150, overflowY: 'auto' }}>
              {cameras.length === 0 ? (
                <div style={{ padding: '10px', textAlign: 'center', color: C.txt3, fontSize: 9 }}>NO CAMERAS CONFIGURED</div>
              ) : cameras.slice(0, 10).map(cam => (
                <div key={cam.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.amber, fontSize: 10, fontWeight: 700, flexShrink: 0, minWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cam.id.slice(-6).toUpperCase()}
                  </span>
                  <span style={{ flex: 1, color: C.txt2, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cam.name}</span>
                  <span className={`ops-badge ${cam.streaming ? 'badge-live' : 'badge-offln'}`}>{cam.streaming ? 'LIVE' : 'OFFLN'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ CENTER ══════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg0 }}>

          {/* Toolbar — 3 view tabs */}
          <div style={{ display: 'flex', alignItems: 'stretch', background: C.bg1, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {(['MAP', 'CAMERAS', 'INCIDENTS'] as const).map(v => (
              <button key={v} className={`ops-tab${centerView === v ? ' active' : ''}`} onClick={() => setCenterView(v)}>
                {v === 'MAP' ? '⊞ MAP' : v === 'CAMERAS' ? '▣ CAMERAS' : '⚠ INCIDENTS'}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, paddingRight: 10 }}>
              {led(C.green, 'led-slow')}
              <span style={{ fontSize: 8, color: C.green, letterSpacing: '0.08em', fontWeight: 700 }}>
                {centerView === 'CAMERAS' ? `${streamingCount}/${cameras.length} LIVE` : 'MAP LIVE'}
              </span>
            </div>
          </div>

          {/* Content area — switches per tab */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>

            {/* MAP VIEW */}
            {centerView === 'MAP' && (
              <OpsMap cameras={cameras} journeys={journeys} />
            )}

            {/* CAMERAS VIEW */}
            {centerView === 'CAMERAS' && (
              <CameraGrid cameras={cameras} recentEvents={recentEvents} C={C} />
            )}

            {/* INCIDENTS VIEW */}
            {centerView === 'INCIDENTS' && (
              <IncidentsView alerts={allAlerts} events={recentEvents} C={C} />
            )}
          </div>

          {/* Ticker */}
          <div style={{ height: 30, background: C.bg1, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: 10,
              flexShrink: 0, borderRight: `1px solid ${C.border}`, height: '100%',
            }}>
              {led(C.red, 'led-amber')}
              <span style={{ fontSize: 10, color: C.red, fontWeight: 700, letterSpacing: '0.1em' }}>LIVE</span>
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <span className="ticker-text" style={{ display: 'inline-block', fontSize: 10, color: C.txt2, letterSpacing: '0.06em' }}>
                {tickerItems.join('')}
              </span>
            </div>
          </div>

          {/* Status bar */}
          <div style={{
            height: 26, background: C.bg1, borderTop: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 18, paddingLeft: 12, paddingRight: 12,
            flexShrink: 0, overflowX: 'auto',
          }}>
            {[
              ['REGION', 'ISB/RWP'],
              ['CAMERAS', String(cameras.length)],
              ['ONLINE', String(streamingCount)],
              ['OFFLINE', String(offlineCount)],
              ['JOURNEYS', String(journeys.length)],
              ['ALERTS', String(alertCount)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: C.txt3, letterSpacing: '0.1em' }}>{k}</span>
                <span style={{ fontSize: 10, color: C.amber, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ RIGHT PANEL — FACE ID ══════════ */}
        <div style={{ background: C.bg1, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Panel header */}
          <div className="ops-panel-hdr">
            {led(C.green, 'led-slow')} FACE ID SYSTEM
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {[
              { label: 'IDENTIFIED', val: faceEvents.length, color: C.green },
              { label: 'FLAGGED', val: faceEvents.filter((f: any) => f.spoofDetected).length, color: C.red },
              { label: 'ACCURACY', val: faceEvents.length > 0 ? `${Math.round(faceEvents.reduce((a: number, f: any) => a + f.confidence, 0) / faceEvents.length * 100)}%` : '—', color: C.amber },
            ].map(s => (
              <div key={s.label} className="ops-stat-cell">
                <div className="ops-stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="ops-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Live face detections */}
          <div className="ops-section-title" style={{ flexShrink: 0 }}>
            {led(C.green, 'led-pulse')}
            LIVE DETECTIONS
          </div>

          <div style={{ flexShrink: 0, padding: '6px 8px' }}>
            {faceEvents.length === 0 ? (
              <div style={{ padding: '10px', textAlign: 'center', color: C.txt3, fontSize: 9 }}>NO FACE DETECTIONS</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
                {faceEvents.slice(0, 9).map((f: any, i: number) => {
                  const spoof = f.spoofDetected
                  const matched = !!f.personId
                  const color = spoof ? C.red : matched ? C.green : C.txt2
                  return (
                    <div key={f.id ?? i} className={`face-tile ${spoof ? 'flagged' : matched ? 'matched' : ''}`}>
                      <Brackets color={color} size={6} />
                      <div className="scanline" style={{ background: `linear-gradient(transparent, ${color}55, transparent)` }} />
                      {f.thumbnailBase64 ? (
                        <img src={`data:image/jpeg;base64,${f.thumbnailBase64}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
                            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                          </svg>
                        </div>
                      )}
                      <div style={{ padding: '3px 4px', borderTop: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 9, color, fontWeight: 700 }}>
                          {f.personName ?? `ID-${(f.id ?? '').slice(-4).toUpperCase()}`}
                        </div>
                        <div style={{ fontSize: 8, color: C.txt3 }}>{Math.round(f.confidence * 100)}%</div>
                        <div className="conf-bar">
                          <div className={`conf-bar-fill ${confClass(f.confidence)}`} style={{ width: `${Math.round(f.confidence * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Watchlist */}
          <div className="ops-section-title" style={{ flexShrink: 0 }}>
            {led(C.red, 'led-slow')}
            WATCHLIST
            <span className="ops-badge badge-alert" style={{ marginLeft: 6 }}>{watchlistData.length} ENTRIES</span>
          </div>

          <div style={{ maxHeight: 140, overflowY: 'auto', flexShrink: 0 }}>
            {watchlistData.length === 0 ? (
              <div style={{ padding: '10px', textAlign: 'center', color: C.txt3, fontSize: 9 }}>NO ACTIVE ENTRIES</div>
            ) : watchlistData.slice(0, 6).map(w => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: `1px solid ${C.border}`, borderLeft: `2px solid ${C.red}` }}>
                <span style={{ color: C.red, fontSize: 12, fontWeight: 700, flex: 1 }}>{w.plateText}</span>
                {w.reason && <span style={{ fontSize: 9, color: C.txt3, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.reason}</span>}
              </div>
            ))}
          </div>

          {/* Unacknowledged alerts */}
          {alertCount > 0 && (
            <>
              <div className="ops-section-title" style={{ flexShrink: 0 }}>
                {led(C.red, 'led-amber')}
                ACTIVE ALERTS
                <span className="ops-badge badge-alert" style={{ marginLeft: 6 }}>{alertCount}</span>
              </div>
              <div style={{ maxHeight: 110, overflowY: 'auto', flexShrink: 0 }}>
                {allAlerts.filter(a => !a.acknowledged).slice(0, 5).map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: `1px solid ${C.border}`, borderLeft: `2px solid ${C.red}` }}>
                    <span style={{ color: C.red, fontSize: 12, fontWeight: 700 }}>{a.plateText}</span>
                    <span style={{ fontSize: 9, color: C.txt3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason ?? '—'}</span>
                  </div>
                ))}
              </div>
            </>
          )}


        </div>
      </div>
    </div>
  )
}
