'use client'
import { useRef, useState, useCallback } from 'react'
import TopBar from '@/components/ui/TopBar'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { DetectionResult, PlateResult, FaceResult, CombinedResult } from '@/types'
import { Upload, Video, Car, X, Loader2, Play, CheckCircle, Activity, User } from 'lucide-react'

function PlateCard({ plate }: { plate: PlateResult }) {
  const pct = Math.round(plate.confidence * 100)
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="plate-badge text-lg">{plate.text}</span>
        <span className={`text-sm font-bold px-2 py-1 rounded-lg ${pct >= 90 ? 'bg-green-100 text-green-700' : pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {pct}%
        </span>
      </div>
      {plate.thumbnail && (
        <img src={`data:image/jpeg;base64,${plate.thumbnail}`} alt={plate.text}
          className="w-full h-20 object-contain bg-slate-50 rounded-lg border border-slate-100" />
      )}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        {plate.region && <div><span className="font-medium">Region:</span> {plate.region}</div>}
        {plate.state && <div><span className="font-medium">State:</span> {plate.state}</div>}
        {plate.personName && (
          <div className="col-span-2 text-blue-600 font-medium">👤 {plate.personName}</div>
        )}
        <div><span className="font-medium">Pos:</span> {Math.round(plate.boundingBox.x)},{Math.round(plate.boundingBox.y)}</div>
        <div><span className="font-medium">Size:</span> {Math.round(plate.boundingBox.width)}×{Math.round(plate.boundingBox.height)}</div>
      </div>
    </div>
  )
}

function FaceCard({ face }: { face: FaceResult }) {
  const pct = Math.round(face.confidence * 100)
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User size={18} className="text-blue-500" />
          <span className="font-bold text-slate-700">{face.personName || 'Unknown Face'}</span>
        </div>
        <span className={`text-sm font-bold px-2 py-1 rounded-lg ${pct >= 90 ? 'bg-green-100 text-green-700' : pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {pct}%
        </span>
      </div>
      {face.thumbnail && (
        <img src={`data:image/jpeg;base64,${face.thumbnail}`} alt="Face"
          className="w-full h-32 object-cover bg-slate-50 rounded-lg border border-slate-100" />
      )}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        {face.similarity !== undefined && (
          <div className="col-span-2 flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="font-medium text-slate-600">Match Confidence:</span>
            <span className={`font-bold ${face.similarity > 0.5 ? 'text-green-600' : 'text-amber-600'}`}>
              {Math.round(face.similarity * 100)}%
            </span>
          </div>
        )}
        <div className="col-span-2"><span className="font-medium">Pos:</span> {Math.round(face.boundingBox.x)},{Math.round(face.boundingBox.y)}</div>
      </div>
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

  const handleFile = (f: File) => {
    setFile(f)
    setResult(null)
    setPreview(URL.createObjectURL(f))
  }

  const detect = async () => {
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await api.detect(fd, { region, maxPlates: '10', thumbnail: 'true' })
      setResult(res)
      if (res.count === 0) toast('No plates detected', 'warning')
      else toast(`Detected ${res.count} plate${res.count > 1 ? 's' : ''}`, 'success')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const clear = () => { setFile(null); setPreview(null); setResult(null) }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-300 hover:bg-blue-50/30'}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => !file && inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {preview
          ? <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-lg object-contain" />
          : <>
            <Upload size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Drop an image here or click to upload</p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, BMP — up to 20MB</p>
          </>}
      </div>

      {file && (
        <div className="flex items-center gap-3">
          <select value={region} onChange={e => setRegion(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white flex-1">
            <option value="NORTH_AMERICAN">North American</option>
            <option value="EUROPEAN">European</option>
            <option value="PACIFIC">Pacific</option>
          </select>
          <button onClick={detect} disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {loading ? 'Detecting…' : 'Detect Plates'}
          </button>
          <button onClick={clear} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
      )}

      {result && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-sm font-medium text-slate-700">
              Found {result.plates.length} plates and {result.faces.length} faces in {result.processingTimeMs}ms
            </span>
          </div>
          <div className="space-y-6">
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
        </div>
      )}
    </div>
  )
}

interface VideoFrame extends CombinedResult {}

function VideoDetector() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [region, setRegion] = useState('NORTH_AMERICAN')
  const [streaming, setStreaming] = useState(false)
  const [frames, setFrames] = useState<VideoFrame[]>([])
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const start = async () => {
    if (!file) return
    setFrames([])
    setDone(false)
    setStreaming(true)

    const fd = new FormData()
    fd.append('video', file)

    try {
      const res = await fetch(`/api/alpr/detect-video?region=${region}&maxPlates=100&thumbnail=true`, {
        method: 'POST', body: fd,
      })
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
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setStreaming(false)
      setDone(true)
    }
  }

  const clear = () => { setFile(null); setFrames([]); setDone(false) }
  const totalPlates = new Set(frames.flatMap(f => f.plates.map(p => p.text))).size
  const totalFaces = frames.reduce((acc, f) => acc + f.faces.length, 0)

  return (
    <div className="space-y-4">
      <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${file ? 'border-violet-300 bg-violet-50' : 'border-slate-300 bg-white hover:border-violet-300 hover:bg-violet-50/30'}`}
        onClick={() => !streaming && inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="video/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setFrames([]); setDone(false) } }} />
        {file
          ? <><Video size={36} className="mx-auto text-violet-400 mb-2" /><p className="font-medium text-slate-700">{file.name}</p><p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p></>
          : <><Video size={36} className="mx-auto text-slate-300 mb-3" /><p className="text-slate-500 font-medium">Drop a video file or click to upload</p><p className="text-xs text-slate-400 mt-1">MP4, MOV, AVI — up to 500MB</p></>}
      </div>

      {file && (
        <div className="flex items-center gap-3">
          <select value={region} onChange={e => setRegion(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white flex-1">
            <option value="NORTH_AMERICAN">North American</option>
            <option value="EUROPEAN">European</option>
            <option value="PACIFIC">Pacific</option>
          </select>
          <button onClick={streaming ? undefined : start} disabled={streaming}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
            {streaming ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {streaming ? 'Processing…' : 'Start Detection'}
          </button>
          {!streaming && <button onClick={clear} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X size={18} /></button>}
        </div>
      )}

      {streaming && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3">
          <Loader2 size={18} className="animate-spin text-violet-500" />
          <div>
            <p className="text-sm font-medium text-violet-700">Processing video frames…</p>
            <p className="text-xs text-violet-500">{frames.length} frames with detections so far</p>
          </div>
        </div>
      )}

      {done && frames.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600" />
          <span className="text-sm font-medium text-green-700">
            Done — {totalPlates} unique plates, {totalFaces} faces detected across {frames.length} frames
          </span>
        </div>
      )}

      {frames.length > 0 && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {frames.map((frame, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500 font-medium mb-2">Frame #{frame.frameIndex} · {frame.processingTimeMs}ms</p>
              <div className="flex flex-wrap gap-2">
                {frame.plates.map((p, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <span className="plate-badge">{p.text}</span>
                    <span className="text-xs text-slate-500">{Math.round(p.confidence * 100)}%</span>
                    {p.personName && <span className="text-xs text-blue-600">👤 {p.personName}</span>}
                  </div>
                ))}
                {frame.faces.map((f, j) => (
                  <div key={j} className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded-lg">
                    <User size={14} className="text-blue-500" />
                    <span className="text-xs font-bold text-blue-700">{f.personName || 'Unknown'}</span>
                    <span className="text-xs text-blue-400">Det: {Math.round(f.confidence * 100)}%</span>
                    {f.similarity !== undefined && (
                      <span className={`text-xs font-bold ${f.similarity > 0.5 ? 'text-green-600' : 'text-amber-500'}`}>
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
  const [frames, setFrames] = useState<VideoFrame[]>([])
  const [done, setDone] = useState(false)

  const start = async () => {
    if (!url) return
    setFrames([])
    setDone(false)
    setStreaming(true)

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
          if (data.plates?.length > 0 || data.faces?.length > 0) setFrames(f => [data, ...f.slice(0, 49)]) // Keep last 50 detection frames
        }
      }
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setStreaming(false)
      setDone(true)
    }
  }

  const stop = () => {
    setStreaming(false)
    setDone(true)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Stream URL (RTSP / HTTP)</label>
          <input
            type="text"
            placeholder="rtsp://admin:password@192.168.1.100:554/stream1"
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={streaming}
          />
        </div>

        <div className="flex items-center gap-3">
          <select value={region} onChange={e => setRegion(e.target.value)} disabled={streaming}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white flex-1">
            <option value="NORTH_AMERICAN">North American</option>
            <option value="EUROPEAN">European</option>
            <option value="PACIFIC">Pacific</option>
          </select>
          {streaming ? (
            <button onClick={stop} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
              <X size={16} /> Stop Stream
            </button>
          ) : (
            <button onClick={start} disabled={!url}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
              <Play size={16} /> Start Feed
            </button>
          )}
        </div>
      </div>

      {streaming && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Activity size={20} className="text-blue-500" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-blue-700">Live Feed Active</p>
              <p className="text-xs text-blue-500">Monitoring for license plates...</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-blue-700">{frames.reduce((acc, f) => acc + f.plates.length, 0)} Plates / {frames.reduce((acc, f) => acc + f.faces.length, 0)} Faces</p>
            <p className="text-xs text-blue-500">Live Detections</p>
          </div>
        </div>
      )}

      {frames.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Recent Detections</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {frames.map((frame, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Frame #{frame.frameIndex}</span>
                  <span className="text-[10px] font-bold text-blue-500">{frame.processingTimeMs}ms</span>
                </div>
                <div className="p-3 flex flex-wrap gap-2">
                  {frame.plates.map((p, j) => (
                    <div key={j} className="flex flex-col gap-1 w-full">
                      <div className="flex items-center justify-between">
                        <span className="plate-badge text-sm">{p.text}</span>
                        <span className="text-xs font-bold text-slate-500">{Math.round(p.confidence * 100)}%</span>
                      </div>
                      {p.thumbnail && (
                        <img src={`data:image/jpeg;base64,${p.thumbnail}`} alt={p.text} className="w-full h-12 object-contain bg-slate-100 rounded border border-slate-200" />
                      )}
                    </div>
                  ))}
                  {frame.faces.map((f, j) => (
                    <div key={j} className="flex flex-col gap-1 w-full border-t border-slate-100 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <User size={14} className="text-blue-500" />
                          <span className="text-sm font-bold text-blue-700">{f.personName || 'Unknown Face'}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-400">Det: {Math.round(f.confidence * 100)}%</span>
                          {f.similarity !== undefined && (
                            <span className={`text-xs font-bold ${f.similarity > 0.5 ? 'text-green-600' : 'text-amber-500'}`}>
                              Match: {Math.round(f.similarity * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                      {f.thumbnail && (
                        <img src={`data:image/jpeg;base64,${f.thumbnail}`} alt="Face" className="w-full h-24 object-cover bg-slate-100 rounded border border-slate-200" />
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
  return (
    <>
      <TopBar title="Detection" subtitle="Upload media or connect live feed" connected={true} />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-1 flex gap-1 w-fit">
            {(['image', 'video', 'live'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${tab === t ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                {t === 'image' ? <Upload size={15} /> : t === 'video' ? <Video size={15} /> : <Activity size={15} />}
                {t === 'live' ? 'Live Feed' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {tab === 'image' ? <ImageDetector /> : tab === 'video' ? <VideoDetector /> : <LiveDetector />}
        </div>
      </main>
    </>
  )
}
