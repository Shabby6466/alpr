'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import TopBar from '@/components/ui/TopBar'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { Camera } from '@/types'
import {
  Video, Plus, Trash2, Power, Edit3, Wifi, WifiOff,
  FileVideo, X, MapPin, Upload, Route, Play, Square, Pause,
} from 'lucide-react'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const card = {
  background: '#FFFFFF',
  borderRadius: 20,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
}

const REGIONS = ['NORTH_AMERICAN', 'EUROPEAN', 'MIDDLE_EASTERN', 'ASIAN', 'PACIFIC', 'AFRICAN', 'SOUTH_AMERICAN']
const REGION_LABELS: Record<string, string> = {
  NORTH_AMERICAN: 'North American / Pakistan ★',
  EUROPEAN: 'European',
  PACIFIC: 'Pacific',
  ASIAN: 'Asian (East Asia)',
  MIDDLE_EASTERN: 'Middle Eastern',
  AFRICAN: 'African',
  SOUTH_AMERICAN: 'South American',
}

function StatusDot({ active, streaming }: { active: boolean; streaming?: boolean }) {
  if (!active) return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
      <span className="w-2 h-2 rounded-full bg-slate-300" /> Inactive
    </span>
  )
  if (streaming) return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#30D158] uppercase tracking-wider">
      <span className="w-2 h-2 rounded-full bg-[#30D158] pulse-dot" /> Live
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#FF9500] uppercase tracking-wider">
      <span className="w-2 h-2 rounded-full bg-[#FF9500]" /> Connecting
    </span>
  )
}

// ── Test Video Panel ────────────────────────────────────────────────────────

// ─── Canvas overlay renderer (mirrors detect page paintOverlay exactly) ────────
function paintOverlay(canvas: HTMLCanvasElement, video: HTMLVideoElement, det: any | null) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr  = window.devicePixelRatio || 1
  const cssW = canvas.clientWidth
  const cssH = canvas.clientHeight
  if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
    canvas.width  = cssW * dpr
    canvas.height = cssH * dpr
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)
  if (!det || video.videoWidth === 0) return
  const vAR = video.videoWidth / video.videoHeight
  const cAR = cssW / cssH
  let rW = cssW, rH = cssH, oX = 0, oY = 0
  if (vAR > cAR) { rH = cssW / vAR; oY = (cssH - rH) / 2 }
  else            { rW = cssH * vAR; oX = (cssW - rW) / 2 }
  const sx = rW / video.videoWidth
  const sy = rH / video.videoHeight
  ctx.lineWidth = 2.5
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif'
  ctx.textBaseline = 'alphabetic'
  const box = (x: number, y: number, w: number, h: number, stroke: string, fill: string, label: string) => {
    const rx = oX + x * sx, ry = oY + y * sy, rw = w * sx, rh = h * sy
    ctx.strokeStyle = stroke; ctx.fillStyle = fill
    ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, 3); ctx.fill(); ctx.stroke()
    if (label) {
      const tw = ctx.measureText(label).width + 10
      ctx.fillStyle = stroke
      ctx.beginPath(); ctx.roundRect(rx, Math.max(0, ry - 18), tw, 18, [3, 3, 0, 0]); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.fillText(label, rx + 5, Math.max(13, ry - 4))
    }
  }
  for (const v of det.vehicles ?? []) {
    box(v.boundingBox.x, v.boundingBox.y, v.boundingBox.width, v.boundingBox.height,
      '#FF9500', 'rgba(255,149,0,0.10)', [v.make, v.model].filter(Boolean).join(' '))
  }
  for (const p of det.plates ?? []) {
    box(p.boundingBox.x, p.boundingBox.y, p.boundingBox.width, p.boundingBox.height,
      '#007AFF', 'rgba(0,122,255,0.12)', `${p.text}  ${Math.round(p.confidence * 100)}%`)
  }
  for (const f of det.faces ?? []) {
    const spoof = f.spoofDetected
    box(f.boundingBox.x, f.boundingBox.y, f.boundingBox.width, f.boundingBox.height,
      spoof ? '#FF3B30' : '#30D158',
      spoof ? 'rgba(255,59,48,0.10)' : 'rgba(48,209,88,0.10)',
      f.personName ?? `Face ${Math.round(f.confidence * 100)}%`)
  }
  if (det.gunDetected) {
    ctx.strokeStyle = '#FF3B30'; ctx.lineWidth = 5
    ctx.strokeRect(3, 3, cssW - 6, cssH - 6)
    ctx.fillStyle = 'rgba(255,59,48,0.08)'; ctx.fillRect(0, 0, cssW, cssH)
    ctx.fillStyle = 'rgba(255,59,48,0.9)'
    ctx.beginPath(); ctx.roundRect(10, 10, 200, 26, 4); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'
    ctx.fillText('⚠  WEAPON DETECTED', 16, 27)
  }
}

function TestVideoPanel({ camera, onClose }: { camera: Camera; onClose: () => void }) {
  const [file, setFile]           = useState<File | null>(null)
  const [videoUrl, setVideoUrl]   = useState<string | null>(null)
  const [dragging, setDragging]   = useState(false)
  const [active, setActive]       = useState(false)
  const [paused, setPaused]       = useState(false)
  const [loopCount, setLoopCount] = useState(0)
  const [uniquePlates, setUniquePlates] = useState(0)
  const [detFps, setDetFps]       = useState(0)
  const [feedFrames, setFeedFrames] = useState<Array<{ plates: any[]; videoTime: number }>>([])
  const [lastFilename, setLastFilename] = useState<string | null>(null)

  const fileInputRef  = useRef<HTMLInputElement>(null)
  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)   // visible overlay
  const captureRef    = useRef<HTMLCanvasElement>(null)   // hidden, frame capture
  const activeRef     = useRef(false)
  const processingRef = useRef(false)
  const lastCapRef    = useRef(-1)
  const lastDetRef    = useRef<any>(null)
  const detMapRef     = useRef(new Map<number, any>())
  const allPlatesRef  = useRef(new Set<string>())
  const rafRef        = useRef<number | null>(null)
  const sessionIdRef  = useRef<string | null>(null)
  const fpsWindowRef  = useRef<number[]>([])
  const { toast }     = useToast()

  const STORAGE_KEY  = `testVideo_${camera.id}`
  const MIN_INTERVAL = 0.15
  const JPEG_QUALITY = 0.88

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setLastFilename(saved)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [STORAGE_KEY])

  const flushSession = useCallback(async (sid: string) => {
    try { await fetch(`/api/alpr/sessions/${sid}/flush`, { method: 'POST' }) } catch {}
  }, [])

  const captureFrame = useCallback((videoTime: number) => {
    const video   = videoRef.current
    const capture = captureRef.current
    if (!video || !capture || video.videoWidth === 0) return
    processingRef.current = true
    lastCapRef.current = videoTime
    const ctx = capture.getContext('2d')!
    capture.width  = video.videoWidth
    capture.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    capture.toBlob(async (blob) => {
      if (!blob) { processingRef.current = false; return }
      try {
        const fd = new FormData()
        fd.append('image', blob, 'frame.jpg')
        const sid = sessionIdRef.current ? `&sessionId=${sessionIdRef.current}` : ''
        const cid = `&cameraId=${encodeURIComponent(camera.id)}&cameraName=${encodeURIComponent(camera.name)}`
        const res = await fetch(
          `/api/alpr/detect?region=${camera.region}&maxPlates=10&thumbnail=true${sid}${cid}`,
          { method: 'POST', body: fd },
        )
        if (!res.ok) return
        const result = await res.json()
        lastDetRef.current = result
        detMapRef.current.set(videoTime, result)
        result.plates?.forEach((p: any) => allPlatesRef.current.add(p.text))
        setUniquePlates(allPlatesRef.current.size)
        const now = Date.now()
        fpsWindowRef.current.push(now)
        fpsWindowRef.current = fpsWindowRef.current.filter(t => now - t < 3000)
        setDetFps(Math.round(fpsWindowRef.current.length / 3))
        if (result.plates?.length || result.faces?.length || result.gunDetected) {
          setFeedFrames(prev => [{ plates: result.plates ?? [], videoTime }, ...prev].slice(0, 60))
        }
      } catch {
        // network blip — skip frame
      } finally {
        processingRef.current = false
      }
    }, 'image/jpeg', JPEG_QUALITY)
  }, [camera.id, camera.name, camera.region])

  const startLoop = useCallback(() => {
    const loop = () => {
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return
      if (activeRef.current && !video.paused && !video.ended && !processingRef.current) {
        const t = video.currentTime
        if (t - lastCapRef.current >= MIN_INTERVAL) captureFrame(t)
      }
      paintOverlay(canvas, video, lastDetRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(loop)
  }, [captureFrame])

  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [])

  const handleFile = (f: File) => {
    stopLoop()
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    activeRef.current = false; processingRef.current = false
    lastCapRef.current = -1; lastDetRef.current = null
    detMapRef.current.clear(); allPlatesRef.current.clear(); fpsWindowRef.current = []
    setVideoUrl(URL.createObjectURL(f))
    setFile(f)
    setActive(false); setPaused(false); setLoopCount(0)
    setUniquePlates(0); setDetFps(0); setFeedFrames([])
    localStorage.setItem(STORAGE_KEY, f.name)
    setLastFilename(f.name)
  }

  const clearFile = () => {
    stopLoop()
    activeRef.current = false
    if (sessionIdRef.current) { flushSession(sessionIdRef.current); sessionIdRef.current = null }
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setFile(null); setVideoUrl(null); setActive(false); setPaused(false)
    setLoopCount(0); setUniquePlates(0); setDetFps(0); setFeedFrames([])
  }

  const startAnalysis = () => {
    const video = videoRef.current
    if (!video) return
    sessionIdRef.current = crypto.randomUUID()
    processingRef.current = false; lastCapRef.current = -1; lastDetRef.current = null
    detMapRef.current.clear(); allPlatesRef.current.clear(); fpsWindowRef.current = []
    setLoopCount(0); setUniquePlates(0); setDetFps(0); setFeedFrames([])
    activeRef.current = true
    setActive(true); setPaused(false)
    video.currentTime = 0
    video.play()
    startLoop()
  }

  const togglePause = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) { video.play(); setPaused(false) }
    else              { video.pause(); setPaused(true) }
  }

  const stopAnalysis = () => {
    activeRef.current = false
    setActive(false); setPaused(false)
    videoRef.current?.pause()
    if (sessionIdRef.current) { flushSession(sessionIdRef.current); sessionIdRef.current = null }
  }

  // On video end: flush session, start new loop
  const handleEnded = useCallback(async () => {
    if (!activeRef.current) return
    if (sessionIdRef.current) await flushSession(sessionIdRef.current)
    setLoopCount(n => n + 1)
    sessionIdRef.current = crypto.randomUUID()
    processingRef.current = false; lastCapRef.current = -1; lastDetRef.current = null
    detMapRef.current.clear(); fpsWindowRef.current = []
    const video = videoRef.current
    if (video && activeRef.current) { video.currentTime = 0; video.play() }
  }, [flushSession])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.addEventListener('ended', handleEnded)
    return () => video.removeEventListener('ended', handleEnded)
  }, [handleEnded, videoUrl])

  // Cleanup object URL on unmount
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }, [videoUrl])

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-top-2 duration-200"
      style={{ background: '#F9F9FB' }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <FileVideo size={14} className="text-[#007AFF]" />
        <span className="text-xs font-bold text-slate-700">
          Test — <span className="text-[#007AFF]">{camera.name}</span>
        </span>
        {camera.zone && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: '#007AFF', background: 'rgba(0,122,255,0.08)' }}>
            <MapPin size={8} />{camera.zone}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {active && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: '#30D158' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] pulse-dot" />
              Loop {loopCount + 1}
            </span>
          )}
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 transition-colors">
            <X size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-4">

          {/* Left: video + controls */}
          <div className="flex-shrink-0 flex flex-col gap-2" style={{ width: 296 }}>

            {/* Video / drop zone */}
            {videoUrl ? (
              <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" muted />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 p-6 transition-all"
                style={{
                  aspectRatio: '16/9',
                  borderColor: dragging ? '#007AFF' : '#E5E5EA',
                  background: dragging ? 'rgba(0,122,255,0.04)' : 'white',
                }}>
                <Upload size={22} className="text-slate-300" />
                <p className="text-xs font-bold text-slate-400 text-center">Drop video or click</p>
                {lastFilename && (
                  <p className="text-[10px] text-slate-300 text-center truncate max-w-full px-2">
                    Last: {lastFilename}
                  </p>
                )}
              </div>
            )}
            <canvas ref={captureRef} className="hidden" />
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

            {/* File info */}
            {file && (
              <div className="rounded-xl px-3 py-2 text-xs flex items-center gap-2"
                style={{ background: 'rgba(0,122,255,0.06)' }}>
                <span className="font-bold text-slate-700 truncate flex-1">{file.name}</span>
                <button onClick={clearFile} className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors">
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Controls */}
            {file && (
              <div className="flex gap-2">
                {!active ? (
                  <button onClick={startAnalysis}
                    className="flex-1 h-9 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all"
                    style={{ background: '#007AFF' }}>
                    <Play size={12} fill="currentColor" />
                    Start Loop
                  </button>
                ) : (
                  <>
                    <button onClick={togglePause}
                      className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                      style={{
                        background: paused ? 'rgba(0,122,255,0.1)' : '#F2F2F7',
                        color: paused ? '#007AFF' : '#3C3C43',
                      }}>
                      {paused
                        ? <><Play size={12} fill="currentColor" /> Resume</>
                        : <><Pause size={12} /> Pause</>
                      }
                    </button>
                    <button onClick={stopAnalysis}
                      className="h-9 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                      style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30' }}>
                      <Square size={12} fill="currentColor" />
                      Stop
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Stats */}
            {active && (
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { label: 'Plates', value: uniquePlates, color: '#007AFF' },
                  { label: 'Det/s',  value: detFps,       color: '#30D158' },
                  { label: 'Loop',   value: loopCount + 1, color: '#5856D6' },
                ] as const).map(s => (
                  <div key={s.label} className="rounded-xl p-2 text-center" style={{ background: '#F2F2F7' }}>
                    <p className="text-base font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: detection feed */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detection Feed</span>
              {uniquePlates > 0 && (
                <Link href="/journeys"
                  className="flex items-center gap-1 text-[10px] font-bold text-[#007AFF] hover:underline">
                  <Route size={10} />
                  View Journeys
                </Link>
              )}
            </div>

            {feedFrames.length === 0 && !active && (
              <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-100"
                style={{ minHeight: 140 }}>
                <p className="text-xs text-slate-300 font-medium text-center px-4">
                  {file ? 'Press Start Loop to begin' : 'Load a video to get started'}
                </p>
              </div>
            )}

            {feedFrames.length === 0 && active && (
              <div className="flex-1 flex items-center justify-center gap-2 rounded-xl"
                style={{ background: 'rgba(0,122,255,0.04)', minHeight: 140 }}>
                <div className="w-4 h-4 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium" style={{ color: '#007AFF' }}>Scanning frames…</p>
              </div>
            )}

            {feedFrames.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1" style={{ maxHeight: 280 }}>
                {feedFrames.flatMap((frame, fi) =>
                  frame.plates.map((p: any, pi: number) => (
                    <div key={`${fi}-${pi}`}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 animate-in fade-in duration-200"
                      style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      {p.thumbnail ? (
                        <img src={`data:image/jpeg;base64,${p.thumbnail}`} alt={p.text}
                          className="w-14 h-8 object-contain rounded-lg flex-shrink-0"
                          style={{ background: '#F2F2F7' }} />
                      ) : (
                        <div className="w-14 h-8 rounded-lg flex-shrink-0" style={{ background: '#F2F2F7' }} />
                      )}
                      <span className="plate-badge text-[11px] flex-1 min-w-0">{p.text}</span>
                      <span className="text-[10px] font-bold tabular-nums rounded-full px-2 py-0.5 flex-shrink-0"
                        style={{
                          color: p.confidence >= 0.9 ? '#30D158' : p.confidence >= 0.7 ? '#FF9500' : '#FF3B30',
                          background: p.confidence >= 0.9 ? 'rgba(48,209,88,0.1)' : p.confidence >= 0.7 ? 'rgba(255,149,0,0.1)' : 'rgba(255,59,48,0.1)',
                        }}>
                        {Math.round(p.confidence * 100)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {!active && uniquePlates > 0 && (
              <div className="rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-medium"
                style={{ background: 'rgba(48,209,88,0.08)', color: '#248A3D' }}>
                <span className="font-black">{uniquePlates}</span> unique plate{uniquePlates !== 1 ? 's' : ''} detected — logged under <strong>{camera.name}</strong>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Camera Form ─────────────────────────────────────────────────────────────

const blank = { name: '', url: '', region: 'NORTH_AMERICAN', frameStep: 5, notes: '', zone: '', lat: '', lng: '' }

export default function CamerasPage() {
  const { data: cameras = [], isLoading } = useSWR<Camera[]>('/api/cameras', fetcher, { refreshInterval: 5000 })
  const [showAdd, setShowAdd] = useState(false)
  const [editCamera, setEditCamera] = useState<Camera | null>(null)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  function openAdd() { setForm(blank); setShowAdd(true) }
  function openEdit(c: Camera) {
    setForm({
      name: c.name, url: c.url, region: c.region,
      frameStep: c.frameStep, notes: c.notes ?? '',
      zone: c.zone ?? '', lat: c.lat?.toString() ?? '', lng: c.lng?.toString() ?? '',
    })
    setEditCamera(c)
  }
  function closeModal() { setShowAdd(false); setEditCamera(null) }

  async function save() {
    if (!form.name.trim() || !form.url.trim()) return toast('Name and URL are required', 'error')
    setSaving(true)
    try {
      const payload: any = {
        name: form.name, url: form.url, region: form.region,
        frameStep: form.frameStep, notes: form.notes || undefined,
        zone: form.zone || undefined,
        lat: form.lat ? parseFloat(form.lat) : undefined,
        lng: form.lng ? parseFloat(form.lng) : undefined,
      }
      if (editCamera) {
        await api.updateCamera(editCamera.id, payload)
        toast('Camera updated')
      } else {
        await api.createCamera({ ...payload, active: true })
        toast('Camera added and stream started')
      }
      mutate('/api/cameras')
      closeModal()
    } catch (e: any) {
      toast(e.message ?? 'Failed to save camera', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(camera: Camera) {
    try {
      await api.updateCamera(camera.id, { active: !camera.active })
      mutate('/api/cameras')
      toast(camera.active ? 'Camera paused' : 'Camera resumed')
    } catch (e: any) {
      toast(e.message ?? 'Failed to update camera', 'error')
    }
  }

  async function remove(camera: Camera) {
    if (!confirm(`Remove camera "${camera.name}"? This stops the stream permanently.`)) return
    try {
      await api.deleteCamera(camera.id)
      mutate('/api/cameras')
      toast('Camera removed')
    } catch (e: any) {
      toast(e.message ?? 'Failed to remove camera', 'error')
    }
  }

  const active = cameras.filter(c => c.active).length
  const streaming = cameras.filter(c => c.streaming).length

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <TopBar title="Camera Management" subtitle="Persistent stream workers with auto-reconnect" connected={streaming > 0} />

      <main className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4">
          {[
            { label: 'Total Cameras', value: cameras.length, color: '#007AFF' },
            { label: 'Active', value: active, color: '#30D158' },
            { label: 'Streaming', value: streaming, color: '#FF9500' },
          ].map(s => (
            <div key={s.label} style={card} className="p-5 flex flex-col gap-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              <p className="text-3xl font-black tracking-tighter" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-800 tracking-tight">Registered Cameras</h2>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ background: '#007AFF' }}>
            <Plus size={16} strokeWidth={2.5} />
            Add Camera
          </button>
        </div>

        {/* Camera list */}
        {isLoading ? (
          <div style={card} className="p-12 text-center text-slate-300 text-sm">Loading cameras…</div>
        ) : cameras.length === 0 ? (
          <div style={card} className="p-16 text-center">
            <Video size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-semibold text-sm">No cameras registered</p>
            <p className="text-slate-300 text-xs mt-1">Add an RTSP or HTTP stream to start monitoring</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cameras.map(camera => (
              <div key={camera.id} style={{ ...card, borderLeft: camera.streaming ? '3px solid #30D158' : camera.active ? '3px solid #FF9500' : '3px solid #E5E5EA' }}
                className="px-5 pt-4 pb-4 animate-in fade-in">

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: camera.streaming ? 'rgba(48,209,88,0.1)' : 'rgba(142,142,147,0.1)' }}>
                    {camera.streaming
                      ? <Wifi size={18} className="text-[#30D158]" />
                      : <WifiOff size={18} className="text-slate-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-bold text-slate-800 truncate">{camera.name}</p>
                      <StatusDot active={camera.active} streaming={camera.streaming} />
                      {camera.zone && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ color: '#007AFF', background: 'rgba(0,122,255,0.08)' }}>
                          <MapPin size={8} />{camera.zone}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate">{camera.url}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{REGION_LABELS[camera.region] ?? camera.region}</span>
                      <span className="text-[10px] text-slate-200">·</span>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Every {camera.frameStep} frames</span>
                      {camera.lat != null && (
                        <>
                          <span className="text-[10px] text-slate-200">·</span>
                          <span className="text-[10px] font-mono text-slate-300">{camera.lat.toFixed(4)}, {camera.lng?.toFixed(4)}</span>
                        </>
                      )}
                      {camera.notes && (
                        <>
                          <span className="text-[10px] text-slate-200">·</span>
                          <span className="text-[10px] text-slate-300 truncate max-w-[160px]">{camera.notes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTestingIds(prev => {
                        const next = new Set(prev)
                        next.has(camera.id) ? next.delete(camera.id) : next.add(camera.id)
                        return next
                      })}
                      title="Test with video"
                      className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: testingIds.has(camera.id) ? '#007AFF' : 'rgba(0,122,255,0.08)',
                        color: testingIds.has(camera.id) ? '#fff' : '#007AFF',
                      }}>
                      <FileVideo size={13} />
                      Test
                    </button>
                    <button onClick={() => openEdit(camera)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-slate-100">
                      <Edit3 size={15} className="text-slate-400" />
                    </button>
                    <button onClick={() => toggleActive(camera)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-slate-100">
                      <Power size={15} className={camera.active ? 'text-[#30D158]' : 'text-slate-300'} />
                    </button>
                    <button onClick={() => remove(camera)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-red-50">
                      <Trash2 size={15} className="text-slate-300 hover:text-[#FF3B30]" />
                    </button>
                  </div>
                </div>

                {/* Test video panel — inline below the camera row */}
                {testingIds.has(camera.id) && (
                  <TestVideoPanel camera={camera} onClose={() => setTestingIds(prev => {
                    const next = new Set(prev); next.delete(camera.id); return next
                  })} />
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit modal */}
      <Modal open={showAdd || editCamera !== null} onClose={closeModal}
        title={editCamera ? `Edit: ${editCamera.name}` : 'Add Camera Stream'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Camera Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
              placeholder="Entrance Gate 1" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Stream URL</label>
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
              placeholder="rtsp://admin:pass@192.168.1.100:554/stream1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Region</label>
              <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 bg-white">
                {REGIONS.map(r => <option key={r} value={r}>{REGION_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Frame Step</label>
              <input type="number" min={1} max={30} value={form.frameStep}
                onChange={e => setForm(f => ({ ...f, frameStep: parseInt(e.target.value) || 5 }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                placeholder="5" />
              <p className="text-[10px] text-slate-400 mt-1">Process every Nth frame (1–30)</p>
            </div>
          </div>

          {/* Location section */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Zone / Location Name <span className="text-slate-300 normal-case font-medium">(for journey tracking)</span>
            </label>
            <input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
              placeholder="e.g. Main Gate, Sector 7, North Checkpoint" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Latitude</label>
              <input type="number" step="any" value={form.lat}
                onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                placeholder="31.5204" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Longitude</label>
              <input type="number" step="any" value={form.lng}
                onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                placeholder="74.3587" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 -mt-2">
            Right-click any spot on Google Maps → copy the coordinates. First number = lat, second = lng.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes (optional)</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
              placeholder="Mounting angle, coverage area, etc." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={closeModal}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: '#007AFF' }}>
              {saving ? 'Saving…' : editCamera ? 'Save Changes' : 'Add & Start Stream'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
