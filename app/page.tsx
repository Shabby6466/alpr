'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { useSSE } from '@/lib/useSSE'
import { DetectionEvent, Alert } from '@/types'
import { Car, Users, Bell, ShieldAlert, Clock, TrendingUp, Activity, Zap } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function StatCard({ label, value, icon: Icon, accent }: {
  label: string; value: string | number; icon: any; accent: string
}) {
  return (
    <div className="rounded-xl p-5 flex items-center gap-4 relative overflow-hidden"
      style={{ background: '#0c1528', border: '1px solid #1a2744' }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10"
        style={{ background: accent + '20', border: `1px solid ${accent}30` }}>
        <Icon size={22} style={{ color: accent }} />
      </div>
      <div className="relative z-10">
        <p className="text-2xl font-bold text-slate-100 leading-tight">{value}</p>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}08)` }} />
    </div>
  )
}

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

export default function Dashboard() {
  const [liveEvents, setLiveEvents] = useState<DetectionEvent[]>([])
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([])
  const { data: eventsData } = useSWR('/api/events?limit=20', fetcher, { refreshInterval: 30000 })
  const { data: alerts } = useSWR('/api/alerts?acknowledged=false', fetcher, { refreshInterval: 10000 })
  const { data: persons } = useSWR('/api/persons', fetcher)
  const { data: watchlist } = useSWR('/api/watchlist?activeOnly=true', fetcher)

  const { connected } = useSSE<DetectionEvent>('/api/events/stream', (ev) => {
    setLiveEvents(prev => [ev, ...prev].slice(0, 30))
  })

  useSSE<Alert>('/api/alerts/stream', (alert) => {
    setLiveAlerts(prev => [alert, ...prev].slice(0, 10))
  })

  const allEvents: DetectionEvent[] = liveEvents.length > 0 ? liveEvents : (eventsData?.data ?? [])
  const todayCount = allEvents.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString()).length

  return (
    <>
      <TopBar title="Dashboard" subtitle="Real-time monitoring overview" connected={connected} />
      <main className="flex-1 p-6 space-y-6">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Detections Today" value={todayCount || allEvents.length} icon={Car} accent="#3b82f6" />
          <StatCard label="Registered Persons" value={persons?.length ?? '—'} icon={Users} accent="#8b5cf6" />
          <StatCard label="Active Alerts" value={alerts?.length ?? '—'} icon={Bell} accent="#ef4444" />
          <StatCard label="Watchlist Entries" value={watchlist?.length ?? '—'} icon={ShieldAlert} accent="#f59e0b" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Live feed */}
          <div className="lg:col-span-2 rounded-xl overflow-hidden"
            style={{ background: '#0c1528', border: '1px solid #1a2744' }}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid #1a2744' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <TrendingUp size={15} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-100 text-sm">Live Detection Feed</h2>
                  <p className="text-xs text-slate-600">{allEvents.length} events loaded</p>
                </div>
              </div>
              {connected && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400" />
                  </span>
                  LIVE
                </span>
              )}
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {allEvents.length === 0 && (
                <div className="py-16 text-center">
                  <Activity size={32} className="mx-auto mb-3" style={{ color: '#1e3358' }} />
                  <p className="text-slate-600 text-sm">Awaiting detections…</p>
                </div>
              )}
              {allEvents.map((ev, i) => (
                <div key={ev.id ?? i}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: '1px solid #0a1525' }}>
                  {ev.thumbnailBase64
                    ? <img src={`data:image/jpeg;base64,${ev.thumbnailBase64}`} alt={ev.plateText}
                        className="w-16 h-9 object-cover rounded-lg"
                        style={{ border: '1px solid #1a2744' }} />
                    : <div className="w-16 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: '#070e1c', border: '1px solid #0f1e38' }}>
                        <Car size={15} style={{ color: '#1e3358' }} />
                      </div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="plate-badge">{ev.plateText}</span>
                      <ConfBadge v={ev.confidence} />
                    </div>
                    {ev.personName && (
                      <p className="text-xs text-blue-400 font-medium mt-0.5">● {ev.personName}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-600 font-mono">{new Date(ev.timestamp).toLocaleTimeString()}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block
                      ${ev.source === 'video' ? 'text-violet-400' : 'text-slate-500'}`}
                      style={{ background: ev.source === 'video' ? 'rgba(139,92,246,0.12)' : 'rgba(100,116,139,0.1)' }}>
                      {ev.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Alerts */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: '#0c1528', border: '1px solid #1a2744' }}>
            <div className="px-5 py-4 flex items-center gap-2.5"
              style={{ borderBottom: '1px solid #1a2744' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Bell size={15} className="text-red-400" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-100 text-sm">Active Alerts</h2>
                <p className="text-xs text-slate-600">Watchlist matches</p>
              </div>
              {(alerts?.length ?? 0) > 0 && (
                <span className="ml-auto text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                  style={{ background: '#ef4444', color: '#fff', boxShadow: '0 0 8px rgba(239,68,68,0.5)' }}>
                  {alerts.length}
                </span>
              )}
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {(liveAlerts.length > 0 ? liveAlerts : alerts ?? []).length === 0 && (
                <div className="py-16 text-center">
                  <Zap size={32} className="mx-auto mb-3" style={{ color: '#1e3358' }} />
                  <p className="text-slate-600 text-sm">No active alerts</p>
                </div>
              )}
              {(liveAlerts.length > 0 ? liveAlerts : alerts ?? []).map((a: Alert, i: number) => (
                <div key={a.id ?? i} className="px-5 py-4 transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: '1px solid #0a1525' }}>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 shrink-0">
                      <span className="relative flex h-2 w-2">
                        <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="plate-badge">{a.plateText}</span>
                      {a.reason && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{a.reason}</p>}
                      <p className="text-xs text-slate-700 mt-1.5 flex items-center gap-1">
                        <Clock size={10} />
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
