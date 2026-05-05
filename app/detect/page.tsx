'use client'
import { useRef, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { DetectionResult, PlateResult, FaceResult, CombinedResult } from '@/types'
import { Upload, Video, Car, X, Loader2, Play, CheckCircle, Activity, User, Square } from 'lucide-react'

const surface = { background: '#0c1528', border: '1px solid #1a2744', borderRadius: 12 }
const surfaceIn = { background: '#07101e', border: '1px solid #1a2744', borderRadius: 8 }

function ConfBadge({ v, size = 'sm' }: { v: number; size?: 'sm' | 'lg' }) {
  const pct = Math.round(v * 100)
  const [color, bg] = pct >= 90
    ? ['#4ade80', 'rgba(74,222,128,0.12)']
    : pct >= 70
    ? ['#fbbf24', 'rgba(251,191,36,0.12)']
    : ['#f87171', 'rgba(248,113,113,0.12)']
  return (
    <span className={`font-bold rounded-full ${size === 'lg' ? 'text-base px-3 py-1' : 'text-xs px-2 py-0.5'}`}
      style={{ color, background: bg, border: `1px solid ${color}30` }}>
      {pct}%
    </span>
  )
}

function PlateCard({ plate }: { plate: PlateResult }) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={surface}>
      <div className="flex items-center justify-between">
        <span className="plate-badge text-base">{plate.text}</span>
        <ConfBadge v={plate.confidence} size="lg" />
      </div>
      {plate.thumbnail && (
        <img src={`data:image/jpeg;base64,${plate.thumbnail}`} alt={plate.text}
          className="w-full h-20 object-contain rounded-lg"
          style={{ background: '#070e1c', border: '1px solid #1a2744' }} />
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: '#475569' }}>
        {plate.region && <div><span className="font-semibold text-slate-500">Region</span> {plate.region}</div>}
        {plate.state && <div><span className="font-semibold text-slate-500">State</span> {plate.state}</div>}
        {plate.personName && (
          <div className="col-span-2 flex items-center gap-1.5 font-semibold text-blue-400">
            <User size={11} />matched: {plate.personName}
          </div>
        )}
        <div className="text-slate-700">Pos: {Math.round(plate.boundingBox.x)},{Math.round(plate.boundingBox.y)}</div>
        <div className="text-slate-700">Size: {Math.round(plate.boundingBox.width)}×{Math.round(plate.boundingBox.height)}</div>
      </div>
    </div>
  )
}

function FaceCard({ face }: { face: FaceResult }) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={surface}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <User size={15} className="text-blue-400" />
          </div>
          <span className="font-bold text-slate-100 text-sm">{face.personName || 'Unknown'}</span>
        </div>
        <ConfBadge v={face.confidence} size="lg" />
      </div>
      {face.thumbnail && (
        <img src={`data:image/jpeg;base64,${face.thumbnail}`} alt="Face"
          className="w-full h-32 object-cover rounded-lg"
          style={{ border: '1px solid #1a2744' }} />
      )}
      {face.similarity !== undefined && (
        <div className="flex justify-between items-center px-3 py-2 rounded-lg"
          style={{ background: '#080f1e', border: '1px solid #1a2744' }}>
          <span className="text-xs text-slate-500 font-semibold">Match confidence</span>
          <span className={`text-sm font-bold ${face.similarity > 0.5 ? 'text-green-400' : 'text-amber-400'}`}>
            {Math.round(face.similarity * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}

function RegionSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      className="rounded-lg px-3 py-2 text-sm text-slate-300 outline-none cursor-pointer flex-1 disabled:opacity-50"
      style={{ background: '#07101e', border: '1px solid #1a2744' }}>
      <option value="NORTH_AMERICAN">North American</option>
      <option value="EUROPEAN">European</option>
      <option value="PACIFIC">Pacific</option>
    </select>
  )
}

function ImageDetector() {
  const { toast } = useToast()
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [region, setRegion] = useState('NORTH_AMERICAN')

  const handleFile = (f: File) => { setFile(f); setResult(null); setPreview(URL.createObjectURL(f)) }
  const clear = () => { setFile(null); setPreview(null); setResult(null) }

  const detect = async () => {
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await api.detect(fd, { region, maxPlates: '10', thumbnail: 'true' })
      setResult(res)
      if (res.count === 0) toast('No plates detected', 'warning')
      else toast(`Detected ${res.count} result${res.count > 1 ? 's' : ''}`, 'success')
    } catch (e: any) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragging ? 'drop-active' : ''}`}
        style={file ? { ...surfaceIn, borderStyle: 'dashed', borderColor: '#1e3a5f' } : { background: '#080f1e', borderColor: '#1a2744' }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => !file && inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {preview
          ? <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-lg object-contain" />
          : <>
            <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Upload size={24} className="text-blue-400" />
            </div>
            <p className="text-slate-400 font-semibold">Drop an image here or click to upload</p>
            <p className="text-xs text-slate-700 mt-1">JPG, PNG, BMP — up to 20MB</p>
          </>}
      </div>

      {file && (
        <div className="flex items-center gap-3">
          <RegionSelect value={region} onChange={setRegion} />
          <button onClick={detect} disabled={loading}
            className="flex items-center gap-2 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{ background: '#2563eb' }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {loading ? 'Detecting…' : 'Detect Plates'}
          </button>
          <button onClick={clear} className="p-2 rounded-lg transition-colors text-slate-600 hover:text-slate-300"
            style={{ background: '#080f1e', border: '1px solid #1a2744' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-sm font-semibold text-green-300">
              {result.plates.length} plates, {result.faces.length} faces — {result.processingTimeMs}ms
            </span>
          </div>
          {result.plates.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.plates.map((p, i) => <PlateCard key={i} plate={p} />)}
            </div>
          )}
          {result.faces.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.faces.map((f, i) => <FaceCard key={i} face={f} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function VideoDetector() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [region, setRegion] = useState('NORTH_AMERICAN')
  const [streaming, setStreaming] = useState(false)
  const [frames, setFrames] = useState<CombinedResult[]>([])
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const start = async () => {
    if (!file) return
    setFrames([]); setDone(false); setStreaming(true)
    const fd = new FormData()
    fd.append('video', file)
    try {
      const res = await fetch(`/api/alpr/detect-video?region=${region}&maxPlates=100&thumbnail=true`, { method: 'POST', body: fd })
      if (!res.body) throw new Error('No response body')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done: d, value } = await reader.read()
        if (d) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const lines = part.trim().split('\n')
          const eventLine = lines.find(l => l.startsWith('event:'))
          const dataLine = lines.find(l => l.startsWith('data:'))
          if (!dataLine) continue
          const data = JSON.parse(dataLine.slice(5).trim())
          if (eventLine?.includes('done')) { setDone(true); break }
          if (data.plates?.length > 0 || data.faces?.length > 0) setFrames(f => [...f, data])
        }
      }
      toast('Video processing complete', 'success')
    } catch (e: any) { toast(e.message, 'error') }
    finally { setStreaming(false); setDone(true) }
  }

  const clear = () => { setFile(null); setFrames([]); setDone(false) }
  const totalPlates = new Set(frames.flatMap(f => f.plates.map(p => p.text))).size
  const totalFaces = frames.reduce((acc, f) => acc + f.faces.length, 0)

  return (
    <div className="space-y-4">
      <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${file ? '' : ''}`}
        style={file ? { ...surfaceIn, borderStyle: 'dashed', borderColor: '#4c1d95' } : { background: '#080f1e', borderColor: '#1a2744' }}
        onClick={() => !streaming && inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="video/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setFrames([]); setDone(false) } }} />
        {file ? (
          <>
            <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
              <Video size={24} className="text-violet-400" />
            </div>
            <p className="font-semibold text-slate-200">{file.name}</p>
            <p className="text-xs text-slate-600 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <Video size={24} className="text-violet-400" />
            </div>
            <p className="text-slate-400 font-semibold">Drop a video file or click to upload</p>
            <p className="text-xs text-slate-700 mt-1">MP4, MOV, AVI — up to 500MB</p>
          </>
        )}
      </div>

      {file && (
        <div className="flex items-center gap-3">
          <RegionSelect value={region} onChange={setRegion} disabled={streaming} />
          <button onClick={streaming ? undefined : start} disabled={streaming}
            className="flex items-center gap-2 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{ background: '#7c3aed' }}>
            {streaming ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {streaming ? 'Processing…' : 'Start Detection'}
          </button>
          {!streaming && (
            <button onClick={clear} className="p-2 rounded-lg transition-colors text-slate-600 hover:text-slate-300"
              style={{ background: '#080f1e', border: '1px solid #1a2744' }}>
              <X size={18} />
            </button>
          )}
        </div>
      )}

      {streaming && (
        <div className="rounded-xl p-4 flex items-center gap-4"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <Loader2 size={20} className="animate-spin text-violet-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-violet-300">Analyzing video frames…</p>
            <p className="text-xs text-violet-600">{frames.length} frames with detections so far</p>
          </div>
        </div>
      )}

      {done && frames.length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-2.5"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle size={16} className="text-green-400" />
          <span className="text-sm font-semibold text-green-300">
            {totalPlates} unique plates · {totalFaces} faces · {frames.length} frames with detections
          </span>
        </div>
      )}

      {frames.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {frames.map((frame, i) => (
            <div key={i} className="rounded-xl overflow-hidden" style={surface}>
              <div className="px-4 py-2 flex justify-between items-center"
                style={{ background: '#080f1e', borderBottom: '1px solid #1a2744' }}>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Frame #{frame.frameIndex}</span>
                <span className="text-xs font-bold text-violet-500">{frame.processingTimeMs}ms</span>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {frame.plates.map((p, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <span className="plate-badge">{p.text}</span>
                    <span className="text-xs font-bold" style={{ color: '#64748b' }}>{Math.round(p.confidence * 100)}%</span>
                    {p.personName && <span className="text-xs text-blue-400 font-semibold">● {p.personName}</span>}
                  </div>
                ))}
                {frame.faces.map((f, j) => (
                  <div key={j} className="flex items-center gap-2 px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <User size={13} className="text-blue-400" />
                    <span className="text-xs font-bold text-blue-300">{f.personName || 'Unknown'}</span>
                    <span className="text-xs text-blue-600">Det: {Math.round(f.confidence * 100)}%</span>
                    {f.similarity !== undefined && (
                      <span className={`text-xs font-bold ${f.similarity > 0.5 ? 'text-green-400' : 'text-amber-400'}`}>
                        Match: {Math.round(f.similarity * 100)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LiveDetector() {
  const { toast } = useToast()
  const [url, setUrl] = useState('')
  const [region, setRegion] = useState('NORTH_AMERICAN')
  const [streaming, setStreaming] = useState(false)
  const [frames, setFrames] = useState<CombinedResult[]>([])
  const [done, setDone] = useState(false)

  const start = async () => {
    if (!url) return
    setFrames([]); setDone(false); setStreaming(true)
    try {
      const res = await api.detectStream({ url, region, maxPlates: 100, thumbnail: true, frameStep: 5 })
      if (!res.body) throw new Error('No response body')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done: d, value } = await reader.read()
        if (d) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const lines = part.trim().split('\n')
          const eventLine = lines.find(l => l.startsWith('event:'))
          const dataLine = lines.find(l => l.startsWith('data:'))
          if (!dataLine) continue
          const data = JSON.parse(dataLine.slice(5).trim())
          if (eventLine?.includes('error')) { throw new Error(data.error) }
          if (eventLine?.includes('done')) { setDone(true); break }
          if (data.plates?.length > 0 || data.faces?.length > 0) setFrames(f => [data, ...f.slice(0, 49)])
        }
      }
    } catch (e: any) { toast(e.message, 'error') }
    finally { setStreaming(false); setDone(true) }
  }

  const totalPlates = frames.reduce((acc, f) => acc + f.plates.length, 0)
  const totalFaces = frames.reduce((acc, f) => acc + f.faces.length, 0)

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-5 space-y-4" style={surface}>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Stream URL (RTSP / HTTP)</label>
          <input type="text"
            placeholder="rtsp://admin:password@192.168.1.100:554/stream1"
            value={url} onChange={e => setUrl(e.target.value)} disabled={streaming}
            className="w-full rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none disabled:opacity-50 transition-all"
            style={{ background: '#07101e', border: '1px solid #1a2744' }} />
        </div>
        <div className="flex items-center gap-3">
          <RegionSelect value={region} onChange={setRegion} disabled={streaming} />
          {streaming ? (
            <button onClick={() => { setStreaming(false); setDone(true) }}
              className="flex items-center gap-2 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ background: '#dc2626' }}>
              <Square size={14} /> Stop Stream
            </button>
          ) : (
            <button onClick={start} disabled={!url}
              className="flex items-center gap-2 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
              style={{ background: '#2563eb' }}>
              <Play size={16} /> Start Feed
            </button>
          )}
        </div>
      </div>

      {streaming && (
        <div className="rounded-xl p-4 flex items-center justify-between"
          style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.2)' }}>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
            </span>
            <div>
              <p className="text-sm font-bold text-cyan-300">Live Feed Active</p>
              <p className="text-xs text-cyan-600">Monitoring for license plates…</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-cyan-300">{totalPlates} Plates · {totalFaces} Faces</p>
            <p className="text-xs text-cyan-700">{frames.length} detection frames</p>
          </div>
        </div>
      )}

      {frames.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Recent Detections</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {frames.map((frame, i) => (
              <div key={i} className="rounded-xl overflow-hidden transition-all hover:border-slate-700"
                style={surface}>
                <div className="px-3 py-2 flex justify-between items-center"
                  style={{ background: '#080f1e', borderBottom: '1px solid #1a2744' }}>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Frame #{frame.frameIndex}</span>
                  <span className="text-xs font-bold text-cyan-600">{frame.processingTimeMs}ms</span>
                </div>
                <div className="p-3 flex flex-wrap gap-2">
                  {frame.plates.map((p, j) => (
                    <div key={j} className="w-full space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="plate-badge">{p.text}</span>
                        <span className="text-xs font-bold text-slate-500">{Math.round(p.confidence * 100)}%</span>
                      </div>
                      {p.thumbnail && (
                        <img src={`data:image/jpeg;base64,${p.thumbnail}`} alt={p.text}
                          className="w-full h-12 object-contain rounded"
                          style={{ background: '#070e1c', border: '1px solid #1a2744' }} />
                      )}
                    </div>
                  ))}
                  {frame.faces.map((f, j) => (
                    <div key={j} className="w-full space-y-1.5 pt-2" style={{ borderTop: '1px solid #0f1e38' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-blue-400" />
                          <span className="text-sm font-bold text-blue-300">{f.personName || 'Unknown'}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-slate-600">Det: {Math.round(f.confidence * 100)}%</span>
                          {f.similarity !== undefined && (
                            <span className={`text-xs font-bold ${f.similarity > 0.5 ? 'text-green-400' : 'text-amber-400'}`}>
                              Match: {Math.round(f.similarity * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                      {f.thumbnail && (
                        <img src={`data:image/jpeg;base64,${f.thumbnail}`} alt="Face"
                          className="w-full h-24 object-cover rounded"
                          style={{ border: '1px solid #1a2744' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DetectPage() {
  const [tab, setTab] = useState<'image' | 'video' | 'live'>('image')

  const tabs = [
    { id: 'image', label: 'Image', icon: Upload, accent: '#2563eb', accentBg: 'rgba(37,99,235,0.15)', accentBorder: 'rgba(37,99,235,0.3)' },
    { id: 'video', label: 'Video', icon: Video, accent: '#7c3aed', accentBg: 'rgba(124,58,237,0.15)', accentBorder: 'rgba(124,58,237,0.3)' },
    { id: 'live',  label: 'Live Feed', icon: Activity, accent: '#0891b2', accentBg: 'rgba(8,145,178,0.15)', accentBorder: 'rgba(8,145,178,0.3)' },
  ] as const

  return (
    <>
      <TopBar title="Detection" subtitle="Upload media or connect a live feed" connected={tab === 'live'} />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Tabs */}
          <div className="flex gap-2 p-1 rounded-xl w-fit" style={{ background: '#0c1528', border: '1px solid #1a2744' }}>
            {tabs.map(t => {
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id as any)}
                  className="px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"
                  style={active ? {
                    background: t.accentBg,
                    border: `1px solid ${t.accentBorder}`,
                    color: t.accent,
                  } : { color: '#475569', border: '1px solid transparent' }}>
                  <t.icon size={15} />
                  {t.label}
                </button>
              )
            })}
          </div>

          {tab === 'image' ? <ImageDetector /> : tab === 'video' ? <VideoDetector /> : <LiveDetector />}
        </div>
      </main>
    </>
  )
}
