'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { useSSE } from '@/lib/useSSE'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { DetectionEvent } from '@/types'
import { Search, Trash2, ChevronLeft, ChevronRight, Car, X, Clock, Video, Camera, User, Wifi, Image, AlertTriangle, ArrowLeft, ArrowRight, Minus } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const appleCard = {
  background: '#FFFFFF',
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
}

const SOURCE_META: Record<string, { label: string; icon: typeof Camera; color: string }> = {
  image:  { label: 'Image',  icon: Image,  color: '#5856D6' },
  video:  { label: 'Video',  icon: Video,  color: '#FF9500' },
  stream: { label: 'Stream', icon: Wifi,   color: '#007AFF' },
  camera: { label: 'Camera', icon: Camera, color: '#30D158' },
}

function ConfBadge({ v }: { v: number }) {
  const pct = Math.round(v * 100)
  const [color, bg] = pct >= 90
    ? ['#30D158', 'rgba(48,209,88,0.1)']
    : pct >= 70
      ? ['#FF9500', 'rgba(255,149,0,0.1)']
      : ['#FF3B30', 'rgba(255,59,48,0.1)']
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums"
      style={{ color, background: bg }}>
      {pct}%
    </span>
  )
}

function DirectionIcon({ dir }: { dir?: string }) {
  if (dir === 'left')  return <ArrowLeft  size={12} className="text-[#007AFF]" />
  if (dir === 'right') return <ArrowRight size={12} className="text-[#30D158]" />
  return <Minus size={12} className="text-slate-300" />
}

function SourceBadge({ source }: { source: string }) {
  const meta = SOURCE_META[source] ?? SOURCE_META.image
  const Icon = meta.icon
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} style={{ color: meta.color }} />
      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: meta.color }}>
        {meta.label}
      </span>
    </div>
  )
}

export default function EventsPage() {
  const { toast } = useToast()
  const [plate, setPlate] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(0)
  const [newCount, setNewCount] = useState(0)
  const limit = 25

  const qs = new URLSearchParams({
    limit: String(limit),
    offset: String(page * limit),
    ...(plate && { plate }),
    ...(source && { source }),
  }).toString()
  const { data, mutate } = useSWR(`/api/events?${qs}`, fetcher, { refreshInterval: 0 })

  const { connected } = useSSE<DetectionEvent>('/api/events/stream', () => {
    setNewCount(n => n + 1)
  })

  const del = async (id: string) => {
    if (!confirm('Permanently delete this record?')) return
    await api.deleteEvent(id)
    toast('Event record deleted', 'info')
    mutate()
  }

  const total = data?.total ?? 0
  const events: DetectionEvent[] = data?.data ?? []
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <TopBar title="Event Logs" subtitle={`${total} detection records`} connected={connected} />

      <main className="flex-1 p-6 max-w-7xl mx-auto space-y-6">

        {/* Filter Bar */}
        <div style={appleCard} className="px-5 py-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-[#F2F2F7] rounded-xl px-4 py-2 flex-1 min-w-[200px] border border-transparent focus-within:border-blue-500/20 focus-within:bg-white transition-all">
            <Search size={15} className="text-slate-400" />
            <input value={plate} onChange={e => { setPlate(e.target.value); setPage(0) }}
              placeholder="Filter by plate number…"
              className="text-sm font-medium outline-none flex-1 bg-transparent text-[#1D1D1F] placeholder-slate-400" />
          </div>

          <div className="flex p-1 bg-[#F2F2F7] rounded-xl">
            {[
              { key: '', label: 'All' },
              { key: 'camera', label: 'Camera' },
              { key: 'stream', label: 'Stream' },
              { key: 'video', label: 'Video' },
              { key: 'image', label: 'Image' },
            ].map(s => (
              <button key={s.key} onClick={() => { setSource(s.key); setPage(0) }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${source === s.key ? 'bg-white text-[#007AFF] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {s.label}
              </button>
            ))}
          </div>

          {(plate || source) && (
            <button onClick={() => { setPlate(''); setSource(''); setPage(0) }}
              className="flex items-center gap-1.5 text-xs font-bold text-[#FF3B30] hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all">
              <X size={14} strokeWidth={2.5} /> Reset
            </button>
          )}

          <div className="ml-auto flex items-center gap-2 text-[11px] font-black text-slate-300 uppercase tracking-widest">
            <span>{total} Total</span>
          </div>
        </div>

        {/* Live Notification Banner */}
        {newCount > 0 && (
          <div className="rounded-2xl px-5 py-3 flex items-center gap-4 bg-blue-50 border border-blue-100 animate-in slide-in-from-top-4 duration-500">
            <div className="live-ring" style={{ width: 10, height: 10 }} />
            <span className="text-sm text-blue-900 font-bold tracking-tight">
              {newCount} new detection{newCount > 1 ? 's' : ''} available
            </span>
            <button onClick={() => { setNewCount(0); mutate() }}
              className="ml-auto text-xs font-black text-[#007AFF] uppercase tracking-wider hover:underline">
              Refresh View
            </button>
          </div>
        )}

        {/* Data Table */}
        <div style={appleCard} className="overflow-hidden border border-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['Thumbnail', 'Plate', 'Confidence', 'Vehicle', 'Identity', 'Direction', 'Source', 'Logged At', ''].map(h => (
                  <th key={h} className="text-left px-4 py-4 text-[10px] font-black tracking-widest uppercase text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {events.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-24 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                      <Clock size={28} className="text-slate-200" strokeWidth={1.5} />
                    </div>
                    <p className="text-slate-400 font-bold">No historical data found</p>
                  </td>
                </tr>
              )}
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors group">
                  {/* Thumbnail */}
                  <td className="px-4 py-3">
                    <div className="relative">
                      {ev.thumbnailBase64
                        ? <img src={`data:image/jpeg;base64,${ev.thumbnailBase64}`} alt={ev.plateText}
                          className="w-20 h-11 object-cover rounded-xl shadow-sm border border-white" />
                        : <div className="w-20 h-11 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-100">
                          <Car size={16} className="text-slate-200" />
                        </div>}
                      {ev.gunDetected && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF3B30] rounded-full flex items-center justify-center">
                          <AlertTriangle size={8} className="text-white" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                  </td>
                  {/* Plate */}
                  <td className="px-4 py-3">
                    <span className="plate-badge text-[11px] font-bold">{ev.plateText}</span>
                  </td>
                  {/* Confidence */}
                  <td className="px-4 py-3">
                    <ConfBadge v={ev.confidence} />
                  </td>
                  {/* Vehicle */}
                  <td className="px-4 py-3">
                    {ev.vehicleMake ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-700 capitalize">
                          {[ev.vehicleMake, ev.vehicleModel].filter(Boolean).join(' ')}
                        </span>
                        {ev.vehicleColor && (
                          <span className="text-[10px] font-bold text-slate-400 capitalize">{ev.vehicleColor}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300">—</span>
                    )}
                  </td>
                  {/* Identity */}
                  <td className="px-4 py-3">
                    {ev.personName ? (
                      <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                        <User size={13} fill="currentColor" className="opacity-20" />
                        {ev.personName}
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tighter">Unknown</span>
                    )}
                  </td>
                  {/* Direction */}
                  <td className="px-4 py-3">
                    <DirectionIcon dir={ev.direction} />
                  </td>
                  {/* Source */}
                  <td className="px-4 py-3">
                    <SourceBadge source={ev.source} />
                    {ev.cameraName && (
                      <p className="text-[9px] text-slate-300 mt-0.5 truncate max-w-[80px]">{ev.cameraName}</p>
                    )}
                  </td>
                  {/* Timestamp */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-800">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                        {new Date(ev.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </td>
                  {/* Delete */}
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => del(ev.id)}
                      className="p-2 rounded-lg text-slate-200 hover:text-[#FF3B30] hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Record {page * limit + 1} – {Math.min((page + 1) * limit, total)} <span className="mx-2">/</span> {total}
            </p>
            <div className="flex items-center gap-1 bg-white rounded-full p-1 shadow-sm border border-slate-100">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 disabled:opacity-20 transition-all">
                <ChevronLeft size={18} strokeWidth={2.5} />
              </button>
              <div className="px-3 text-xs font-black text-slate-800">{page + 1}</div>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 disabled:opacity-20 transition-all">
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
