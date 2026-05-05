'use client'
import { useState, useCallback } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { useSSE } from '@/lib/useSSE'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { DetectionEvent } from '@/types'
import { Search, Trash2, ChevronLeft, ChevronRight, Car, Filter } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

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
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[160px]">
            <Search size={15} className="text-slate-400" />
            <input value={plate} onChange={e => { setPlate(e.target.value); setPage(0) }}
              placeholder="Search plate…"
              className="text-sm outline-none flex-1 text-slate-700 placeholder:text-slate-400" />
          </div>
          <select value={source} onChange={e => { setSource(e.target.value); setPage(0) }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
            <option value="">All sources</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          {(plate || source) && (
            <button onClick={() => { setPlate(''); setSource(''); setPage(0) }}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 border border-slate-200">
              <Filter size={14} />Clear
            </button>
          )}
        </div>

        {/* New events banner */}
        {newEvents.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full pulse-dot" />
            <span className="text-sm text-blue-700 font-medium">
              {newEvents.length} new detection{newEvents.length > 1 ? 's' : ''} since last refresh
            </span>
            <button onClick={() => { setNewEvents([]); mutate() }}
              className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium">Refresh</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Thumbnail</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plate</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Confidence</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Person</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Timestamp</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {events.length === 0 && (
                <tr><td colSpan={7} className="py-16 text-center text-slate-400">No events found</td></tr>
              )}
              {events.map(ev => {
                const pct = Math.round(ev.confidence * 100)
                return (
                  <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      {ev.thumbnailBase64
                        ? <img src={`data:image/jpeg;base64,${ev.thumbnailBase64}`} alt={ev.plateText}
                            className="w-16 h-9 object-cover rounded border border-slate-200 bg-slate-100" />
                        : <div className="w-16 h-9 bg-slate-100 rounded border border-slate-100 flex items-center justify-center">
                            <Car size={14} className="text-slate-300" />
                          </div>}
                    </td>
                    <td className="px-4 py-3"><span className="plate-badge">{ev.plateText}</span></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct >= 90 ? 'bg-green-100 text-green-700' : pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{ev.personName ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ev.source === 'video' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                        {ev.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => del(ev.id)}
                        className="p-1.5 text-slate-300 hover:text-red-400 rounded hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-slate-600 px-2">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
