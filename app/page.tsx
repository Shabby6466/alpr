'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { useSSE } from '@/lib/useSSE'
import { DetectionEvent, Alert } from '@/types'
import { Car, Users, Bell, ShieldAlert, Clock, TrendingUp } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: any; color: string
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function PlateTag({ text }: { text: string }) {
  return <span className="plate-badge">{text}</span>
}

function ConfBadge({ v }: { v: number }) {
  const pct = Math.round(v * 100)
  const color = pct >= 90 ? 'bg-green-100 text-green-700' : pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{pct}%</span>
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
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Detections Today" value={todayCount || allEvents.length} icon={Car} color="bg-blue-500" />
          <StatCard label="Registered Persons" value={persons?.length ?? '—'} icon={Users} color="bg-violet-500" />
          <StatCard label="Active Alerts" value={alerts?.length ?? '—'} icon={Bell} color="bg-red-500" />
          <StatCard label="Watchlist Entries" value={watchlist?.length ?? '—'} icon={ShieldAlert} color="bg-amber-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live feed */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" />
                <h2 className="font-semibold text-slate-800 text-sm">Live Detection Feed</h2>
              </div>
              {connected && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-dot" />Live</span>}
            </div>
            <div className="divide-y divide-slate-50 max-h-[420px] overflow-y-auto">
              {allEvents.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-sm">No detections yet</div>
              )}
              {allEvents.map((ev, i) => (
                <div key={ev.id ?? i} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  {ev.thumbnailBase64
                    ? <img src={`data:image/jpeg;base64,${ev.thumbnailBase64}`} alt={ev.plateText}
                        className="w-16 h-9 object-cover rounded border border-slate-200 bg-slate-100" />
                    : <div className="w-16 h-9 bg-slate-100 rounded border border-slate-200 flex items-center justify-center">
                        <Car size={16} className="text-slate-300" />
                      </div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <PlateTag text={ev.plateText} />
                      <ConfBadge v={ev.confidence} />
                    </div>
                    {ev.personName && (
                      <p className="text-xs text-blue-600 font-medium mt-0.5">👤 {ev.personName}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">{new Date(ev.timestamp).toLocaleTimeString()}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ev.source === 'video' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                      {ev.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Alerts panel */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Bell size={16} className="text-red-500" />
              <h2 className="font-semibold text-slate-800 text-sm">Active Alerts</h2>
              {(alerts?.length ?? 0) > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  {alerts.length}
                </span>
              )}
            </div>
            <div className="divide-y divide-slate-50 max-h-[420px] overflow-y-auto">
              {(liveAlerts.length > 0 ? liveAlerts : alerts ?? []).length === 0 && (
                <div className="py-12 text-center text-slate-400 text-sm">No active alerts</div>
              )}
              {(liveAlerts.length > 0 ? liveAlerts : alerts ?? []).map((a: Alert, i: number) => (
                <div key={a.id ?? i} className="px-5 py-3">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0 pulse-dot" />
                    <div>
                      <PlateTag text={a.plateText} />
                      {a.reason && <p className="text-xs text-slate-500 mt-1">{a.reason}</p>}
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Clock size={11} />
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
