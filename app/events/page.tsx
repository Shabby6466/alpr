'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { useSSE } from '@/lib/useSSE'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { DetectionEvent } from '@/types'
import { Search, Trash2, ChevronLeft, ChevronRight, Car, SlidersHorizontal, X } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function ConfBadge({ v }: { v: number }) {
  const pct = Math.round(v * 100)
  const [color, bg] = pct >= 90
    ? ['#4ade80', 'rgba(74,222,128,0.12)']
    : pct >= 70
    ? ['#fbbf24', 'rgba(251,191,36,0.12)']
    : ['#f87171', 'rgba(248,113,113,0.12)']
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color, background: bg, border: `1px solid ${color}30` }}>
      {pct}%
    </span>
  )
}

export default function EventsPage() {
  const { toast } = useToast()
  const [plate, setPlate] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(0)
  const [newEvents, setNewEvents] = useState<DetectionEvent[]>([])
  const limit = 25

  const qs = new URLSearchParams({ limit: String(limit), offset: String(page * limit), ...(plate && { plate }), ...(source && { source }) }).toString()
  const { data, mutate } = useSWR(`/api/events?${qs}`, fetcher, { refreshInterval: 0 })

  const { connected } = useSSE<DetectionEvent>('/api/events/stream', (ev) => {
    setNewEvents(p => [ev, ...p].slice(0, 5))
    mutate()
  })

  const del = async (id: string) => {
    await api.deleteEvent(id)
    toast('Event deleted', 'info')
    mutate()
  }

  const total = data?.total ?? 0
  const events: DetectionEvent[] = data?.data ?? []
  const totalPages = Math.ceil(total / limit)

  return (
    <>
      <TopBar title="Events Log" subtitle={`${total} total detections`} connected={connected} />
      <main className="flex-1 p-6 space-y-4">

        {/* Filters */}
        <div className="rounded-xl p-4 flex flex-wrap gap-3"
          style={{ background: '#0c1528', border: '1px solid #1a2744' }}>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-[160px]"
            style={{ background: '#07101e', border: '1px solid #1a2744' }}>
            <Search size={14} className="text-slate-600" />
            <input value={plate} onChange={e => { setPlate(e.target.value); setPage(0) }}
              placeholder="Search plate…"
              className="text-sm outline-none flex-1 bg-transparent text-slate-200 placeholder-slate-700" />
          </div>
          <select value={source} onChange={e => { setSource(e.target.value); setPage(0) }}
            className="rounded-lg px-3 py-2 text-sm text-slate-300 outline-none cursor-pointer"
            style={{ background: '#07101e', border: '1px solid #1a2744' }}>
            <option value="">All sources</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          {(plate || source) && (
            <button onClick={() => { setPlate(''); setSource(''); setPage(0) }}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg transition-colors"
              style={{ background: '#07101e', border: '1px solid #1a2744' }}>
              <X size={14} />Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-600">
            <SlidersHorizontal size={13} />
            <span>{total} events</span>
          </div>
        </div>

        {/* New events banner */}
        {newEvents.length > 0 && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <span className="relative flex h-2 w-2">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span className="text-sm text-blue-300 font-medium">
              {newEvents.length} new detection{newEvents.length > 1 ? 's' : ''} since last refresh
            </span>
            <button onClick={() => { setNewEvents([]); mutate() }}
              className="ml-auto text-xs text-blue-400 hover:text-blue-200 font-semibold transition-colors">
              Refresh →
            </button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#0c1528', border: '1px solid #1a2744' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #1a2744', background: '#080f1e' }}>
                {['Thumbnail', 'Plate', 'Confidence', 'Person', 'Source', 'Timestamp', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold tracking-widest uppercase"
                    style={{ color: '#334155' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Car size={36} className="mx-auto mb-3" style={{ color: '#1a2744' }} />
                    <p className="text-slate-600 text-sm">No events found</p>
                  </td>
                </tr>
              )}
              {events.map((ev, idx) => (
                <tr key={ev.id}
                  className="transition-colors hover:bg-white/[0.025]"
                  style={{ borderBottom: '1px solid #0a1525' }}>
                  <td className="px-4 py-3">
                    {ev.thumbnailBase64
                      ? <img src={`data:image/jpeg;base64,${ev.thumbnailBase64}`} alt={ev.plateText}
                          className="w-16 h-9 object-cover rounded-lg"
                          style={{ border: '1px solid #1a2744' }} />
                      : <div className="w-16 h-9 rounded-lg flex items-center justify-center"
                          style={{ background: '#070e1c', border: '1px solid #0f1e38' }}>
                          <Car size={13} style={{ color: '#1e3358' }} />
                        </div>}
                  </td>
                  <td className="px-4 py-3"><span className="plate-badge">{ev.plateText}</span></td>
                  <td className="px-4 py-3"><ConfBadge v={ev.confidence} /></td>
                  <td className="px-4 py-3 text-xs font-medium" style={{ color: ev.personName ? '#60a5fa' : '#1e3358' }}>
                    {ev.personName ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={ev.source === 'video'
                        ? { color: '#a78bfa', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }
                        : { color: '#64748b', background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
                      {ev.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: '#475569' }}>
                    {new Date(ev.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => del(ev.id)}
                      className="p-1.5 rounded-lg transition-colors text-slate-700 hover:text-red-400 hover:bg-red-950/30">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ background: '#0c1528', border: '1px solid #1a2744' }}>
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-slate-500 px-3 py-2 rounded-lg"
                style={{ background: '#0c1528', border: '1px solid #1a2744' }}>
                {page + 1} / {totalPages}
              </span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ background: '#0c1528', border: '1px solid #1a2744' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
