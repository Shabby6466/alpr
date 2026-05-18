'use client'
import { useState, useRef, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import TopBar from '@/components/ui/TopBar'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { Camera } from '@/types'
import {
  Video, Plus, Trash2, Power, Edit3, Wifi, WifiOff,
  FileVideo, X, MapPin, Upload, Route, Play, Square,
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

interface DetectedPlate {
  text: string
  confidence: number
  thumbnail?: string
  frameIndex: number
}

function TestVideoPanel({ camera, onClose }: { camera: Camera; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [frames, setFrames] = useState(0)
  const [plates, setPlates] = useState<DetectedPlate[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { toast } = useToast()

  // Clean up object URL on unmount
  useEffect(() => () => { if (videoSrc) URL.revokeObjectURL(videoSrc) }, [videoSrc])

  function pick(f: File) {
    if (videoSrc) URL.revokeObjectURL(videoSrc)
    setFile(f)
    setVideoSrc(URL.createObjectURL(f))
    setPlates([])
    setFrames(0)
    setStatus('idle')
    setErrorMsg('')
  }

  function stop() {
    abortRef.current?.abort()
    setStatus('done')
  }

  async function run() {
    if (!file) return
    abortRef.current = new AbortController()
    setStatus('running')
    setPlates([])
    setFrames(0)
    setErrorMsg('')

    // Map: plate text → best (highest confidence) DetectedPlate
    const bestPlates = new Map<string, DetectedPlate>()

    try {
      const form = new FormData()
      form.append('video', file)

      const res = await fetch(`/api/cameras/${camera.id}/test-video`, {
        method: 'POST',
        body: form,
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Server error ${res.status}${body ? ': ' + body : ''}`)
      }
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const chunks = buf.split('\n\n')
        buf = chunks.pop() ?? ''

        for (const chunk of chunks) {
          const lines = chunk.split('\n')
          const eventType = lines.find(l => l.startsWith('event:'))?.slice(6).trim()
          const dataLine  = lines.find(l => l.startsWith('data:'))?.slice(5).trim()
          if (!dataLine) continue

          const data = JSON.parse(dataLine)

          if (eventType === 'detection') {
            const fi: number = data.frameIndex ?? 0
            for (const p of (data.plates ?? []) as any[]) {
              const existing = bestPlates.get(p.text)
              if (!existing || p.confidence > existing.confidence) {
                bestPlates.set(p.text, {
                  text: p.text,
                  confidence: p.confidence,
                  thumbnail: p.thumbnail,
                  frameIndex: fi,
                })
              }
            }
            setFrames(fi + 1)
            setPlates([...bestPlates.values()])
          } else if (eventType === 'done') {
            setFrames(data.frames ?? 0)
            setStatus('done')
          } else if (eventType === 'error') {
            setErrorMsg(data.error ?? 'Unknown error')
            setStatus('error')
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setErrorMsg(e.message ?? 'Upload failed')
      setStatus('error')
      toast(e.message ?? 'Test failed', 'error')
    }
  }

  const running = status === 'running'
  const done    = status === 'done' || status === 'error'

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
        {!camera.lat && (
          <span className="text-[10px] text-[#FF9500] font-medium ml-1">
            No GPS set — edit camera to enable map
          </span>
        )}
        <button onClick={onClose} className="ml-auto p-1 rounded-lg hover:bg-slate-200 transition-colors">
          <X size={14} className="text-slate-400" />
        </button>
      </div>

      <div className="p-4">
        <div className="flex gap-4" style={{ minHeight: 240 }}>

          {/* Left: video preview + drop zone */}
          <div className="flex-shrink-0 w-64 flex flex-col gap-3">
            {videoSrc ? (
              <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                <video
                  src={videoSrc}
                  className="w-full h-full object-contain"
                  controls={!running}
                  muted
                />
                {running && (
                  <div className="absolute inset-0 flex items-end justify-start p-2 pointer-events-none">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-white px-2 py-1 rounded-full"
                      style={{ background: 'rgba(255,59,48,0.85)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white pulse-dot" />
                      PROCESSING
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pick(f) }}
                onClick={() => fileRef.current?.click()}
                className="flex-1 rounded-xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-2 p-4"
                style={{
                  borderColor: dragging ? '#007AFF' : '#E5E5EA',
                  background: dragging ? 'rgba(0,122,255,0.04)' : 'white',
                  minHeight: 140,
                }}>
                <Upload size={24} className="text-slate-300" />
                <p className="text-xs font-bold text-slate-400 text-center">Drop video or click to browse</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) pick(f) }} />

            {/* File info */}
            {file && (
              <div className="rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(0,122,255,0.06)' }}>
                <p className="font-bold text-slate-700 truncate">{file.name}</p>
                <p className="text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            )}

            {/* Status counter */}
            {(running || done) && (
              <div className="rounded-xl px-3 py-2 flex justify-between text-xs" style={{ background: '#F2F2F7' }}>
                <span className="text-slate-400 font-medium">Frames</span>
                <span className="font-black tabular-nums" style={{ color: '#007AFF' }}>{frames}</span>
              </div>
            )}

            {/* Action button */}
            {!running ? (
              <button
                disabled={!file}
                onClick={run}
                className="w-full h-9 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{ background: '#007AFF' }}>
                <Play size={13} fill="currentColor" />
                {done ? 'Run Again' : 'Start Test'}
              </button>
            ) : (
              <button
                onClick={stop}
                className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30' }}>
                <Square size={12} fill="currentColor" />
                Stop
              </button>
            )}
          </div>

          {/* Right: live detection feed */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Detection Feed
              </span>
              {plates.length > 0 && (
                <Link href="/journeys"
                  className="flex items-center gap-1 text-[10px] font-bold text-[#007AFF] hover:underline">
                  <Route size={10} />
                  View Journeys
                </Link>
              )}
            </div>

            {status === 'error' && (
              <div className="rounded-xl px-3 py-2 text-xs font-medium text-[#FF3B30]"
                style={{ background: 'rgba(255,59,48,0.08)' }}>
                {errorMsg}
              </div>
            )}

            {plates.length === 0 && !running && status === 'idle' && (
              <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-100">
                <p className="text-xs text-slate-300 font-medium">Plates appear here as video is processed</p>
              </div>
            )}

            {plates.length === 0 && running && (
              <div className="flex-1 flex items-center justify-center gap-2 rounded-xl"
                style={{ background: 'rgba(0,122,255,0.04)' }}>
                <div className="w-4 h-4 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-[#007AFF] font-medium">Scanning frames…</p>
              </div>
            )}

            {plates.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: 280 }}>
                {plates.map(p => (
                  <div key={p.text}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 animate-in fade-in slide-in-from-right-4 duration-300"
                    style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    {p.thumbnail ? (
                      <img src={`data:image/jpeg;base64,${p.thumbnail}`} alt={p.text}
                        className="w-16 h-9 object-contain rounded-lg flex-shrink-0"
                        style={{ background: '#F2F2F7' }} />
                    ) : (
                      <div className="w-16 h-9 rounded-lg flex-shrink-0" style={{ background: '#F2F2F7' }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="plate-badge text-[11px]">{p.text}</span>
                    </div>
                    <span className="text-[10px] font-bold tabular-nums rounded-full px-2 py-0.5 flex-shrink-0"
                      style={{
                        color: p.confidence >= 0.9 ? '#30D158' : p.confidence >= 0.7 ? '#FF9500' : '#FF3B30',
                        background: p.confidence >= 0.9 ? 'rgba(48,209,88,0.1)' : p.confidence >= 0.7 ? 'rgba(255,149,0,0.1)' : 'rgba(255,59,48,0.1)',
                      }}>
                      {Math.round(p.confidence * 100)}%
                    </span>
                    <span className="text-[9px] text-slate-300 font-mono flex-shrink-0">f{p.frameIndex}</span>
                  </div>
                ))}
              </div>
            )}

            {done && plates.length > 0 && (
              <div className="rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-medium"
                style={{ background: 'rgba(48,209,88,0.08)', color: '#248A3D' }}>
                <span className="font-black">{plates.length}</span> unique plate{plates.length !== 1 ? 's' : ''} from {frames} frames — logged under <strong>{camera.name}</strong>
              </div>
            )}

            {done && plates.length === 0 && status !== 'error' && (
              <div className="rounded-xl px-3 py-2 text-xs text-slate-400 font-medium"
                style={{ background: '#F2F2F7' }}>
                No plates detected in {frames} frames
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
  const [testingId, setTestingId] = useState<string | null>(null)
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
                      onClick={() => setTestingId(testingId === camera.id ? null : camera.id)}
                      title="Test with video"
                      className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: testingId === camera.id ? '#007AFF' : 'rgba(0,122,255,0.08)',
                        color: testingId === camera.id ? '#fff' : '#007AFF',
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
                {testingId === camera.id && (
                  <TestVideoPanel camera={camera} onClose={() => setTestingId(null)} />
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
