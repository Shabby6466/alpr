'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { Route, Camera, ChevronDown, ChevronUp, MapPin, Clock, ArrowRight, Map } from 'lucide-react'

const JourneyMap = dynamic(() => import('@/components/ui/JourneyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full flex items-center justify-center rounded-2xl"
      style={{ height: 360, background: '#0f0f1a' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-medium text-slate-500">Loading map…</p>
      </div>
    </div>
  ),
})

const fetcher = (url: string) => fetch(url).then(r => r.json())

const appleCard = {
  background: '#FFFFFF',
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
}

interface JourneySighting {
  id: string
  cameraId?: string
  cameraName?: string
  zone?: string
  lat?: number
  lng?: number
  seenAt: string
  thumbnailBase64?: string
  confidence: number
}

interface Journey {
  id: string
  plateText: string
  status: 'active' | 'closed'
  startedAt: string
  lastSeenAt: string
  sightings: JourneySighting[]
}

function formatDuration(startedAt: string, lastSeenAt: string) {
  const ms = new Date(lastSeenAt).getTime() - new Date(startedAt).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function SightingDot({ sighting, index, total }: { sighting: JourneySighting; index: number; total: number }) {
  return (
    <div className="flex gap-3 items-start">
      {/* Timeline line */}
      <div className="flex flex-col items-center flex-shrink-0 w-7 mt-1">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white"
          style={{ background: index === 0 ? '#007AFF' : index === total - 1 ? '#30D158' : '#FF9500' }}>
          {index + 1}
        </div>
        {index < total - 1 && (
          <div className="w-px flex-1 min-h-[32px] mt-1" style={{ background: 'rgba(60,60,67,0.1)' }} />
        )}
      </div>

      {/* Sighting card */}
      <div className="flex-1 pb-4">
        <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: '#F2F2F7' }}>
          {sighting.thumbnailBase64 ? (
            <img src={`data:image/jpeg;base64,${sighting.thumbnailBase64}`} alt="plate"
              className="w-16 h-10 object-cover rounded-lg flex-shrink-0 border border-white shadow-sm" />
          ) : (
            <div className="w-16 h-10 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
              <Camera size={14} className="text-slate-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-800 truncate">
                {sighting.cameraName ?? sighting.cameraId ?? 'Unknown camera'}
              </span>
              {sighting.zone && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,122,255,0.1)', color: '#007AFF' }}>
                  <MapPin size={9} />
                  {sighting.zone}
                </span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(48,209,88,0.1)', color: '#30D158' }}>
                {Math.round(sighting.confidence * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock size={10} className="text-slate-400 flex-shrink-0" />
              <span className="text-[11px] font-medium text-slate-400">
                {formatTime(sighting.seenAt)} · {formatDate(sighting.seenAt)}
              </span>
            </div>
            {sighting.lat != null && sighting.lng != null && (
              <span className="text-[10px] text-slate-300 font-medium">
                {sighting.lat.toFixed(5)}, {sighting.lng.toFixed(5)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function JourneyRow({ journey }: { journey: Journey }) {
  const [expanded, setExpanded] = useState(false)
  const [showMap, setShowMap] = useState(true)
  const cameras = [...new Set(journey.sightings.map(s => s.cameraName ?? s.cameraId ?? '?'))]
  const isActive = journey.status === 'active'
  const crossCamera = new Set(journey.sightings.map(s => s.cameraId)).size > 1
  const hasGps = journey.sightings.some(s => s.lat != null && s.lng != null)

  return (
    <div style={appleCard} className="overflow-hidden border border-white">
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
      >
        {/* Plate */}
        <span className="plate-badge text-[12px] flex-shrink-0">{journey.plateText}</span>

        {/* Status */}
        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-tight flex items-center gap-1.5 flex-shrink-0"
          style={isActive
            ? { color: '#30D158', background: 'rgba(48,209,88,0.1)' }
            : { color: '#8E8E93', background: '#F2F2F7' }}>
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] pulse-dot" />}
          {isActive ? 'Active' : 'Closed'}
        </span>

        {/* Cross-camera badge */}
        {crossCamera && (
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0"
            style={{ color: '#FF9500', background: 'rgba(255,149,0,0.1)' }}>
            <Route size={9} />
            {cameras.length} cameras
          </span>
        )}

        {/* Camera trail (compact) */}
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
          {cameras.slice(0, 4).map((cam, i) => (
            <span key={i} className="flex items-center gap-1 text-[11px] font-medium text-slate-400 flex-shrink-0">
              {i > 0 && <ArrowRight size={9} className="text-slate-300" />}
              <span className="truncate max-w-[100px]">{cam}</span>
            </span>
          ))}
          {cameras.length > 4 && (
            <span className="text-[11px] text-slate-300 font-medium flex-shrink-0">+{cameras.length - 4} more</span>
          )}
        </div>

        {/* Duration + sighting count */}
        <div className="flex items-center gap-3 flex-shrink-0 text-right">
          <div className="text-right">
            <p className="text-[11px] font-bold text-slate-800">
              {journey.sightings.length} sighting{journey.sightings.length !== 1 ? 's' : ''}
            </p>
            <p className="text-[10px] font-medium text-slate-400">
              {formatDuration(journey.startedAt, journey.lastSeenAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-slate-600">{formatTime(journey.startedAt)}</p>
            <p className="text-[10px] font-medium text-slate-400">{formatDate(journey.startedAt)}</p>
          </div>
          {expanded
            ? <ChevronUp size={16} className="text-slate-300 flex-shrink-0" />
            : <ChevronDown size={16} className="text-slate-300 flex-shrink-0" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">

          {/* Map section */}
          {hasGps && (
            <div className="px-5 pt-4 pb-2">
              {/* Map / Timeline toggle */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex rounded-xl overflow-hidden bg-slate-100 p-0.5 gap-0.5">
                  <button
                    onClick={() => setShowMap(true)}
                    className="flex items-center gap-1.5 px-3 h-7 text-xs font-bold rounded-lg transition-all"
                    style={{ background: showMap ? '#fff' : 'transparent', color: showMap ? '#007AFF' : '#8E8E93',
                      boxShadow: showMap ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                    <Map size={12} />
                    Map
                  </button>
                  <button
                    onClick={() => setShowMap(false)}
                    className="flex items-center gap-1.5 px-3 h-7 text-xs font-bold rounded-lg transition-all"
                    style={{ background: !showMap ? '#fff' : 'transparent', color: !showMap ? '#007AFF' : '#8E8E93',
                      boxShadow: !showMap ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                    <Route size={12} />
                    Timeline
                  </button>
                </div>
                <span className="text-xs text-slate-400 font-medium ml-1">
                  {journey.sightings.filter(s => s.lat != null).length} of {journey.sightings.length} sightings mapped
                </span>
              </div>

              {showMap ? (
                <JourneyMap sightings={journey.sightings} plateText={journey.plateText} />
              ) : (
                <div className="space-y-0 pt-1">
                  {journey.sightings
                    .slice()
                    .sort((a, b) => new Date(a.seenAt).getTime() - new Date(b.seenAt).getTime())
                    .map((s, i) => (
                      <SightingDot key={s.id} sighting={s} index={i} total={journey.sightings.length} />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* If no GPS — always show timeline only */}
          {!hasGps && (
            <div className="px-5 pt-3 pb-4">
              <div className="space-y-0">
                {journey.sightings
                  .slice()
                  .sort((a, b) => new Date(a.seenAt).getTime() - new Date(b.seenAt).getTime())
                  .map((s, i) => (
                    <SightingDot key={s.id} sighting={s} index={i} total={journey.sightings.length} />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function JourneysPage() {
  const [plateFilter, setPlateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all')

  const qs = new URLSearchParams()
  if (plateFilter) qs.set('plate', plateFilter)
  if (statusFilter !== 'all') qs.set('status', statusFilter)
  qs.set('limit', '50')

  const { data, isLoading } = useSWR<{ data: Journey[]; total: number }>(
    `/api/journeys?${qs}`,
    fetcher,
    { refreshInterval: 10_000 },
  )

  const journeys = data?.data ?? []
  const total = data?.total ?? 0
  const activeCount = journeys.filter(j => j.status === 'active').length

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <TopBar
        title="Journey Tracker"
        subtitle={activeCount > 0 ? `${activeCount} vehicle${activeCount !== 1 ? 's' : ''} currently moving` : 'No active journeys'}
        connected={true}
      />

      <main className="flex-1 p-6 max-w-5xl mx-auto space-y-5">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search plate…"
            value={plateFilter}
            onChange={e => setPlateFilter(e.target.value.toUpperCase())}
            className="h-10 px-4 rounded-xl text-sm font-medium border-0 outline-none bg-white shadow-sm"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)' }}
          />
          <div className="flex rounded-xl overflow-hidden shadow-sm bg-white">
            {(['all', 'active', 'closed'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-4 h-10 text-sm font-bold capitalize transition-all"
                style={{
                  background: statusFilter === s ? '#007AFF' : 'transparent',
                  color: statusFilter === s ? '#fff' : '#8E8E93',
                }}>
                {s}
              </button>
            ))}
          </div>
          <span className="text-xs font-bold text-slate-400 ml-auto">{total} journey{total !== 1 ? 's' : ''}</span>
        </div>

        {/* Journey list */}
        {isLoading ? (
          <div className="py-24 text-center text-sm font-medium text-slate-400">Loading…</div>
        ) : journeys.length === 0 ? (
          <div style={appleCard} className="py-24 text-center border border-white">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
              <Route size={32} className="text-slate-200" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-bold text-slate-800">No Journeys Yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Journeys are recorded when cameras detect plates. Make sure cameras are active.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {journeys.map(j => <JourneyRow key={j.id} journey={j} />)}
          </div>
        )}
      </main>
    </div>
  )
}
