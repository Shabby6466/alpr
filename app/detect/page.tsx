'use client'
import { useRef, useState, useCallback } from 'react'
import TopBar from '@/components/ui/TopBar'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { DetectionResult, PlateResult } from '@/types'
import { Upload, Video, Car, X, Loader2, Play, CheckCircle } from 'lucide-react'

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
              {result.count} plate{result.count !== 1 ? 's' : ''} detected in {result.processingTimeMs}ms
            </span>
          </div>
          {result.count === 0
            ? <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-slate-200">No license plates found in this image</div>
            : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.plates.map((p, i) => <PlateCard key={i} plate={p} />)}
            </div>}
        </div>
      )}
    </div>
  )
}

interface VideoFrame { frameIndex: number; plates: PlateResult[]; processingTimeMs: number }

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
          if (data.plates?.length > 0) setFrames(f => [...f, data])
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
            Done — {frames.length} frames with plates, {totalPlates} unique plate{totalPlates !== 1 ? 's' : ''}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DetectPage() {
  const [tab, setTab] = useState<'image' | 'video'>('image')
  return (
    <>
      <TopBar title="Detection" subtitle="Upload image or video for ALPR" connected={true} />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-1 flex gap-1 w-fit">
            {(['image', 'video'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${tab === t ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                {t === 'image' ? <Upload size={15} /> : <Video size={15} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {tab === 'image' ? <ImageDetector /> : <VideoDetector />}
        </div>
      </main>
    </>
  )
}
