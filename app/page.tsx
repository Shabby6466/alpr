'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { useSSE } from '@/lib/useSSE'
import { DetectionEvent, Alert, Camera, Journey } from '@/types'
import {
  Car, Bell, TrendingUp, Zap, Video, MapPin,
  AlertTriangle, Route,
} from 'lucide-react'

const DashboardMap = dynamic(() => import('@/components/ui/DashboardMap'), { ssr: false })

const fetcher = (url: string) => fetch(url).then(r => r.json())

const card = {
  background: '#FFFFFF',
  borderRadius: 16,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
}

function StatCard({
  label, value, sub, icon: Icon, color, bg,
}: {
  label: string; value: string | number; sub?: string
  icon: any; color: string; bg: string
}) {
  return (
    <div style={card} className="p-5 flex items-center gap-4">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bg }}
      >
        <Icon size={20} style={{ color }} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p
          className="text-[22px] font-bold tabular-nums leading-tight"
          style={{ color: '#1D1D1F', letterSpacing: '-0.02em' }}
        >
          {value}
        </p>
        <p className="text-xs font-medium mt-0.5 truncate" style={{ color: '#6E6E73' }}>{label}</p>
        {sub && <p className="text-[10px] font-semibold mt-0.5" style={{ color }}>{sub}</p>}
      </div>
    </div>
  )
}

function ConfBadge({ v }: { v: number }) {
  const pct = Math.round(v * 100)
  const [color, bg] = pct >= 90
    ? ['#30D158', 'rgba(48,209,88,0.1)']
    : pct >= 70
    ? ['#FF9500', 'rgba(255,149,0,0.1)']
    : ['#FF3B30', 'rgba(255,59,48,0.1)']
  return (
    <span
      className="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-full"
      style={{ color, background: bg }}
    >
      {pct}%
    </span>
  )
}

export default function Dashboard() {
  const [liveEvents, setLiveEvents] = useState<DetectionEvent[]>([])
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([])

  const { data: eventsData } = useSWR('/api/events?limit=30', fetcher, { refreshInterval: 30000 })
  const { data: alertsData } = useSWR('/api/alerts?acknowledged=false', fetcher, { refreshInterval: 10000 })
  const { data: camerasData } = useSWR('/api/cameras', fetcher, { refreshInterval: 20000 })
  const { data: journeysData } = useSWR('/api/journeys?status=active&limit=20', fetcher, { refreshInterval: 15000 })

  const { connected } = useSSE<DetectionEvent>('/api/events/stream', ev =>
    setLiveEvents(p => [ev, ...p].slice(0, 50)))
  useSSE<Alert>('/api/alerts/stream', alert =>
    setLiveAlerts(p => [alert, ...p].slice(0, 20)))

  const allEvents: DetectionEvent[] = liveEvents.length > 0 ? liveEvents : (eventsData?.data ?? [])
  const alerts: Alert[] = liveAlerts.length > 0 ? liveAlerts : (alertsData ?? [])
  const cameras: Camera[] = camerasData ?? []
  const journeys: Journey[] = journeysData?.data ?? []

  const today = new Date().toDateString()
  const todayCount = allEvents.filter(e => new Date(e.timestamp).toDateString() === today).length
  const streamingCount = cameras.filter(c => c.streaming).length
  const camerasWithGps = cameras.filter(c => c.lat != null && c.lng != null).length

  return (
    <>
      <TopBar title="Dashboard" subtitle="Real-time surveillance" connected={connected} />
      <main className="flex-1 p-6 space-y-4 overflow-auto">

        {/* Stat row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Detections Today"
            value={todayCount || allEvents.length}
            icon={Car}
            color="#007AFF"
            bg="rgba(0,122,255,0.1)"
          />
          <StatCard
            label="Active Cameras"
            value={`${streamingCount} / ${cameras.length}`}
            sub={camerasWithGps > 0 ? `${camerasWithGps} mapped` : undefined}
            icon={Video}
            color="#30D158"
            bg="rgba(48,209,88,0.1)"
          />
          <StatCard
            label="Active Journeys"
            value={journeys.length}
            sub={journeys.length > 0 ? 'trails on map' : undefined}
            icon={Route}
            color="#FF9500"
            bg="rgba(255,149,0,0.1)"
          />
          <StatCard
            label="Pending Alerts"
            value={alertsData?.length ?? '—'}
            sub={alertsData?.length > 0 ? 'requires review' : undefined}
            icon={Bell}
            color="#FF3B30"
            bg="rgba(255,59,48,0.1)"
          />
        </div>

        {/* Live Map — centerpiece */}
        <div style={{ ...card, overflow: 'hidden' }}>
          {/* Map header */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{
              borderBottom: '1px solid rgba(60,60,67,0.08)',
              background: '#fff',
              position: 'relative', zIndex: 10,
            }}
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <MapPin size={15} strokeWidth={2.5} style={{ color: '#007AFF' }} />
              <span className="font-semibold text-sm" style={{ color: '#1D1D1F' }}>
                Live City Map
              </span>
              {cameras.length > 0 && (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: '#007AFF', background: 'rgba(0,122,255,0.08)' }}
                >
                  {cameras.length} camera{cameras.length !== 1 ? 's' : ''}
                </span>
              )}
              {journeys.length > 0 && (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: '#FF9500', background: 'rgba(255,149,0,0.08)' }}
                >
                  {journeys.length} active trail{journeys.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {/* Legend */}
            <div className="hidden md:flex items-center gap-4">
              <LegendItem color="#30D158" type="dot" label="Streaming" />
              <LegendItem color="#8E8E93" type="dot" label="Offline" />
              <LegendItem color="#007AFF" type="line" label="Journey trail" />
            </div>
          </div>

          {/* Map canvas */}
          <div style={{ height: 480 }}>
            {cameras.length === 0 && journeys.length === 0 ? (
              <div
                className="h-full flex flex-col items-center justify-center gap-3"
                style={{ background: '#F9F9FB' }}
              >
                <MapPin size={36} strokeWidth={1.5} style={{ color: '#D1D1D6' }} />
                <p className="text-sm font-medium" style={{ color: '#AEAEB2' }}>
                  No cameras configured
                </p>
                <p className="text-xs" style={{ color: '#C7C7CC' }}>
                  Add cameras with GPS coordinates to see them on the map
                </p>
              </div>
            ) : (
              <DashboardMap cameras={cameras} journeys={journeys} />
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Live Detection Feed */}
          <div className="lg:col-span-2" style={card}>
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(60,60,67,0.08)' }}
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp size={16} strokeWidth={2} style={{ color: '#007AFF' }} />
                <span className="font-semibold text-sm" style={{ color: '#1D1D1F' }}>
                  Live Detection Feed
                </span>
              </div>
              {connected && (
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#30D158' }}>
                  <span className="live-ring" />
                  Live
                </div>
              )}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
              {allEvents.length === 0 ? (
                <EmptyState icon={Car} message="No detections yet" />
              ) : allEvents.map((ev, i) => (
                <div
                  key={ev.id ?? i}
                  className="flex items-center gap-3 px-5 py-3 transition-colors"
                  style={{ borderBottom: '1px solid rgba(60,60,67,0.05)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.018)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {ev.thumbnailBase64 ? (
                    <img
                      src={`data:image/jpeg;base64,${ev.thumbnailBase64}`}
                      alt={ev.plateText}
                      className="flex-shrink-0 object-cover rounded-lg"
                      style={{ width: 64, height: 36, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                    />
                  ) : (
                    <div
                      className="flex-shrink-0 rounded-lg flex items-center justify-center"
                      style={{ width: 64, height: 36, background: '#F2F2F7' }}
                    >
                      <Car size={14} strokeWidth={1.5} style={{ color: '#C7C7CC' }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="plate-badge">{ev.plateText}</span>
                      <ConfBadge v={ev.confidence} />
                    </div>
                    {ev.cameraName && (
                      <p className="text-[11px] font-medium mt-0.5 truncate" style={{ color: '#6E6E73' }}>
                        {ev.cameraName}
                      </p>
                    )}
                    {ev.personName && (
                      <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#007AFF' }}>
                        ● {ev.personName}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-mono tabular-nums" style={{ color: '#AEAEB2' }}>
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </p>
                    <span
                      className="text-[10px] font-semibold mt-0.5 inline-block px-1.5 py-0.5 rounded"
                      style={{
                        color: ev.source === 'camera' ? '#30D158' : ev.source === 'video' ? '#5856D6' : '#6E6E73',
                        background: ev.source === 'camera'
                          ? 'rgba(48,209,88,0.08)'
                          : ev.source === 'video'
                          ? 'rgba(88,86,214,0.08)'
                          : 'rgba(60,60,67,0.06)',
                      }}
                    >
                      {ev.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Alerts */}
          <div style={card}>
            <div
              className="flex items-center gap-2.5 px-5 py-4"
              style={{ borderBottom: '1px solid rgba(60,60,67,0.08)' }}
            >
              <Zap size={16} strokeWidth={2} style={{ color: '#FF3B30' }} />
              <span className="font-semibold text-sm" style={{ color: '#1D1D1F' }}>Active Alerts</span>
              {alerts.length > 0 && (
                <span
                  className="ml-auto text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center"
                  style={{ background: '#FF3B30' }}
                >
                  {alerts.length}
                </span>
              )}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
              {alerts.length === 0 ? (
                <EmptyState icon={Bell} message="No active alerts" />
              ) : alerts.map((a: Alert, i: number) => (
                <div
                  key={a.id ?? i}
                  className="px-5 py-4 transition-colors"
                  style={{ borderBottom: '1px solid rgba(60,60,67,0.05)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.018)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      size={14}
                      strokeWidth={2}
                      className="flex-shrink-0 mt-0.5"
                      style={{ color: '#FF3B30' }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="plate-badge">{a.plateText}</span>
                      {a.reason && (
                        <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: '#6E6E73' }}>
                          {a.reason}
                        </p>
                      )}
                      <p className="text-[10px] mt-1.5 tabular-nums font-mono" style={{ color: '#AEAEB2' }}>
                        {new Date(a.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </>
  )
}

function LegendItem({
  color, type, label,
}: {
  color: string; type: 'dot' | 'line'; label: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      {type === 'dot' ? (
        <span
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: color, display: 'inline-block',
          }}
        />
      ) : (
        <span
          style={{
            width: 22, height: 2.5, borderRadius: 2,
            background: color, display: 'inline-block',
          }}
        />
      )}
      <span className="text-[11px] font-semibold" style={{ color: '#6E6E73' }}>{label}</span>
    </div>
  )
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="py-14 text-center">
      <Icon size={28} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: '#D1D1D6' }} />
      <p className="text-sm font-medium" style={{ color: '#AEAEB2' }}>{message}</p>
    </div>
  )
}
