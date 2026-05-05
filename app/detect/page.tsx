'use client'
import { useRef, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { DetectionResult, PlateResult, FaceResult, CombinedResult } from '@/types'
import { Upload, Video, Car, X, Loader2, Play, CheckCircle, Activity, User, Square, Globe } from 'lucide-react'

const appleCard = {
  background: '#FFFFFF',
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
}

function ConfBadge({ v, size = 'sm' }: { v: number; size?: 'sm' | 'lg' }) {
  const pct = Math.round(v * 100)
  const [color, bg] = pct >= 90
    ? ['#30D158', 'rgba(48,209,88,0.1)']
    : pct >= 70
    ? ['#FF9500', 'rgba(255,149,0,0.1)']
    : ['#FF3B30', 'rgba(255,59,48,0.1)']
  return (
    <span className={`font-bold tabular-nums rounded-full ${size === 'lg' ? 'text-sm px-3 py-1' : 'text-[10px] px-2 py-0.5'}`}
      style={{ color, background: bg }}>
      {pct}%
    </span>
  )
}

function PlateCard({ plate }: { plate: PlateResult }) {
  return (
    <div style={appleCard} className="p-4 space-y-3 transition-transform hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <span className="plate-badge text-base">{plate.text}</span>
        <ConfBadge v={plate.confidence} size="lg" />
      </div>
      {plate.thumbnail && (
        <img src={`data:image/jpeg;base64,${plate.thumbnail}`} alt={plate.text}
          className="w-full h-24 object-contain rounded-xl"
          style={{ background: '#F2F2F7', border: '1px solid rgba(60,60,67,0.08)' }} />
      )}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-medium" style={{ color: '#8E8E93' }}>
        {plate.region && <div className="bg-slate-50 px-2 py-1 rounded-md"><span className="text-[9px] uppercase text-slate-400 block">Region</span> {plate.region}</div>}
        {plate.state && <div className="bg-slate-50 px-2 py-1 rounded-md"><span className="text-[9px] uppercase text-slate-400 block">State</span> {plate.state}</div>}
        {plate.personName && (
          <div className="col-span-2 flex items-center gap-1.5 font-bold px-2 py-1.5 rounded-md" style={{ color: '#007AFF', background: 'rgba(0,122,255,0.05)' }}>
            <User size={12} />Matched: {plate.personName}
          </div>
        )}
      </div>
    </div>
  )
}

function FaceCard({ face }: { face: FaceResult }) {
  return (
    <div style={appleCard} className="p-4 space-y-3 transition-transform hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(145deg, #007AFF, #0055D4)' }}>
            <User size={15} className="text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: '#1D1D1F' }}>{face.personName || 'Unknown Face'}</span>
        </div>
        <ConfBadge v={face.confidence} size="lg" />
      </div>
      {face.thumbnail && (
        <img src={`data:image/jpeg;base64,${face.thumbnail}`} alt="Face"
          className="w-full h-36 object-cover rounded-xl shadow-inner"
          style={{ border: '1px solid rgba(60,60,67,0.08)' }} />
      )}
      {face.similarity !== undefined && (
        <div className="flex justify-between items-center px-3 py-2 rounded-xl"
          style={{ background: '#F2F2F7' }}>
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">Biometric Match</span>
          <span className={`text-sm font-bold tabular-nums ${face.similarity > 0.5 ? 'text-[#30D158]' : 'text-[#FF9500]'}`}>
            {Math.round(face.similarity * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}

function RegionSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-sm border border-slate-100 flex-1">
      <Globe size={14} className="text-slate-400" />
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="text-sm font-semibold text-slate-700 outline-none cursor-pointer w-full bg-transparent disabled:opacity-50">
        <option value="NORTH_AMERICAN">North American</option>
        <option value="EUROPEAN">European</option>
        <option value="PACIFIC">Pacific</option>
      </select>
    </div>
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
    <div className="space-y-5">
      <div
        className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 ${dragging ? 'drop-active' : ''}`}
        style={file 
          ? { background: 'white', borderColor: '#007AFF', borderStyle: 'solid' } 
          : { background: 'rgba(255,255,255,0.5)', borderColor: 'rgba(60,60,67,0.1)' }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => !file && inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        
        {preview ? (
          <div className="relative group">
            <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-2xl shadow-lg object-contain bg-slate-50" />
            <button onClick={(e) => { e.stopPropagation(); clear() }}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className="py-6">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(135deg, rgba(0,122,255,0.1), rgba(0,122,255,0.05))' }}>
              <Upload size={28} className="text-[#007AFF]" strokeWidth={2} />
            </div>
            <p className="text-lg font-bold tracking-tight" style={{ color: '#1D1D1F' }}>Upload Image</p>
            <p className="text-sm mt-1.5" style={{ color: '#8E8E93' }}>Drag and drop or click to browse</p>
            <div className="mt-6 flex items-center justify-center gap-3">
               <span className="px-2 py-1 bg-slate-100 text-[10px] font-bold text-slate-400 rounded">JPG</span>
               <span className="px-2 py-1 bg-slate-100 text-[10px] font-bold text-slate-400 rounded">PNG</span>
               <span className="px-2 py-1 bg-slate-100 text-[10px] font-bold text-slate-400 rounded">20MB MAX</span>
            </div>
          </div>
        )}
      </div>

      {file && (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <RegionSelect value={region} onChange={setRegion} />
          <button onClick={detect} disabled={loading}
            className="btn-apple flex items-center gap-2 px-6 h-10 min-w-[140px] justify-center">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
            {loading ? 'Processing…' : 'Detect Now'}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{ background: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.15)' }}>
            <div className="w-6 h-6 rounded-full bg-[#30D158] flex items-center justify-center">
               <CheckCircle size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-[#248A3D]">
              Found {result.plates.length} plates and {result.faces.length} faces in {result.processingTimeMs}ms
            </span>
          </div>
          
          {(result.plates.length > 0 || result.faces.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.plates.map((p, i) => <PlateCard key={`p-${i}`} plate={p} />)}
              {result.faces.map((f, i) => <FaceCard key={`f-${i}`} face={f} />)}
            </div>
          ) : (
            <div className="py-12 text-center" style={appleCard}>
               <Activity size={32} className="mx-auto mb-3 text-slate-200" />
               <p className="text-sm font-semibold text-slate-400">No objects identified</p>
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
    <div className="space-y-5">
      <div className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${file ? 'bg-white border-indigo-500 border-solid' : 'bg-white/50 border-slate-200 hover:border-slate-300'}`}
        onClick={() => !streaming && inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="video/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setFrames([]); setDone(false) } }} />
        {file ? (
          <div className="py-2">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-sm bg-indigo-50">
              <Video size={28} className="text-indigo-600" />
            </div>
            <p className="font-bold text-lg" style={{ color: '#1D1D1F' }}>{file.name}</p>
            <p className="text-sm font-medium mt-1" style={{ color: '#8E8E93' }}>{(file.size / 1024 / 1024).toFixed(1)} MB · Ready for analysis</p>
          </div>
        ) : (
          <div className="py-6">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-sm bg-indigo-50/50">
              <Video size={28} className="text-indigo-400" />
            </div>
            <p className="text-lg font-bold" style={{ color: '#1D1D1F' }}>Process Video</p>
            <p className="text-sm mt-1" style={{ color: '#8E8E93' }}>MP4, MOV up to 500MB</p>
          </div>
        )}
      </div>

      {file && (
        <div className="flex items-center gap-3">
          <RegionSelect value={region} onChange={setRegion} disabled={streaming} />
          <button onClick={streaming ? undefined : start} disabled={streaming}
            className="btn-apple flex items-center gap-2 px-6 h-10 min-w-[160px] justify-center bg-indigo-600">
            {streaming ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
            {streaming ? 'Analysing…' : 'Start Processing'}
          </button>
          {!streaming && (
            <button onClick={clear} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 transition-colors">
              <X size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
      )}

      {streaming && (
        <div className="rounded-2xl p-5 flex items-center gap-4 bg-indigo-50 border border-indigo-100">
          <div className="live-ring" style={{ width: 12, height: 12 }} />
          <div>
            <p className="text-sm font-bold text-indigo-900">GPU Acceleration Active</p>
            <p className="text-xs font-medium text-indigo-500">{frames.length} frames processed · Real-time streaming</p>
          </div>
        </div>
      )}

      {done && frames.length > 0 && (
        <div className="rounded-2xl px-5 py-3 flex items-center gap-3 bg-emerald-50 border border-emerald-100">
          <CheckCircle size={18} className="text-emerald-500" />
          <span className="text-sm font-bold text-emerald-800">
            {totalPlates} unique plates · {totalFaces} faces · {frames.length} frames
          </span>
        </div>
      )}

      {frames.length > 0 && (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {frames.map((frame, i) => (
            <div key={i} style={appleCard} className="overflow-hidden border border-slate-50">
              <div className="px-4 py-2.5 flex justify-between items-center bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Frame {frame.frameIndex}</span>
                <span className="text-[10px] font-bold text-indigo-500">{frame.processingTimeMs}ms</span>
              </div>
              <div className="p-4 flex flex-wrap gap-3">
                {frame.plates.map((p, j) => (
                  <div key={j} className="flex items-center gap-2.5 bg-white border border-slate-100 rounded-lg pl-1.5 pr-3 py-1.5 shadow-sm">
                    <span className="plate-badge text-xs px-2 py-0.5">{p.text}</span>
                    <ConfBadge v={p.confidence} />
                    {p.personName && <span className="text-[11px] text-indigo-600 font-bold">● {p.personName}</span>}
                  </div>
                ))}
                {frame.faces.map((f, j) => (
                  <div key={j} className="flex items-center gap-2.5 bg-white border border-slate-100 rounded-lg px-3 py-1.5 shadow-sm">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                       <User size={12} className="text-indigo-600" />
                    </div>
                    <span className="text-[11px] font-bold text-indigo-900">{f.personName || 'Unknown'}</span>
                    <ConfBadge v={f.confidence} />
                    {f.similarity !== undefined && (
                      <span className={`text-[11px] font-black ${f.similarity > 0.5 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {Math.round(f.similarity * 100)}% Match
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
    <div className="space-y-5">
      <div style={appleCard} className="p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Stream Endpoint (RTSP / HTTP)</label>
          <div className="relative">
            <input type="text"
              placeholder="rtsp://camera-ip:554/live"
              value={url} onChange={e => setUrl(e.target.value)} disabled={streaming}
              className="w-full rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RegionSelect value={region} onChange={setRegion} disabled={streaming} />
          {streaming ? (
            <button onClick={() => { setStreaming(false); setDone(true) }}
              className="flex items-center gap-2 text-white px-6 h-10 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 transition-colors shadow-sm">
              <Square size={14} fill="white" /> Stop Stream
            </button>
          ) : (
            <button onClick={start} disabled={!url}
              className="btn-apple flex items-center gap-2 px-8 h-10 justify-center shadow-md">
              <Play size={16} fill="currentColor" /> Connect
            </button>
          )}
        </div>
      </div>

      {streaming && (
        <div className="rounded-2xl p-5 flex items-center justify-between bg-cyan-50 border border-cyan-100 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="live-ring" />
            <div>
              <p className="text-sm font-bold text-cyan-900">Link Established</p>
              <p className="text-xs font-medium text-cyan-600">Analyzing {frames.length} frames/sec</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-cyan-900">{totalPlates} PLATES · {totalFaces} FACES</p>
            <p className="text-[10px] font-bold text-cyan-700 tracking-wider">SECURE TRANSMISSION</p>
          </div>
        </div>
      )}

      {frames.length > 0 && (
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Intercepted Detections</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {frames.map((frame, i) => (
              <div key={i} style={appleCard} className="overflow-hidden group hover:ring-2 hover:ring-blue-500/10 transition-all">
                <div className="px-4 py-2 flex justify-between items-center bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Frame {frame.frameIndex}</span>
                  <span className="text-[10px] font-bold text-cyan-600">{frame.processingTimeMs}ms</span>
                </div>
                <div className="p-4 space-y-4">
                  {frame.plates.map((p, j) => (
                    <div key={j} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="plate-badge">{p.text}</span>
                        <ConfBadge v={p.confidence} />
                      </div>
                      {p.thumbnail && (
                        <img src={`data:image/jpeg;base64,${p.thumbnail}`} alt={p.text}
                          className="w-full h-14 object-contain rounded-xl bg-slate-50"
                          style={{ border: '1px solid rgba(60,60,67,0.05)' }} />
                      )}
                    </div>
                  ))}
                  {frame.faces.map((f, j) => (
                    <div key={j} className="space-y-2 pt-3 border-t border-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
                            <User size={12} className="text-blue-500" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">{f.personName || 'Unknown'}</span>
                        </div>
                        <ConfBadge v={f.confidence} />
                      </div>
                      {f.thumbnail && (
                        <img src={`data:image/jpeg;base64,${f.thumbnail}`} alt="Face"
                          className="w-full h-28 object-cover rounded-xl shadow-sm" />
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
    { id: 'image', label: 'Image', icon: Upload },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'live',  label: 'Live Stream', icon: Activity },
  ] as const

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <TopBar title="Detection Intelligence" subtitle="Multimedia processing engine" connected={tab === 'live'} />
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Segmented Control (Apple Style) */}
          <div className="flex p-1 bg-white/50 backdrop-blur-md rounded-2xl w-fit mx-auto shadow-sm border border-white/50">
            {tabs.map(t => {
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id as any)}
                  className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all duration-200 ${active ? 'bg-white text-[#007AFF] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  <t.icon size={15} strokeWidth={active ? 2.5 : 2} />
                  {t.label}
                </button>
              )
            })}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             {tab === 'image' ? <ImageDetector /> : tab === 'video' ? <VideoDetector /> : <LiveDetector />}
          </div>
        </div>
      </main>
    </div>
  )
}
