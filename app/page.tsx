'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { useSSE } from '@/lib/useSSE'
import { DetectionEvent, Alert } from '@/types'
import { Car, Users, Bell, ShieldAlert, TrendingUp, Zap } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const card = {
  background: '#FFFFFF',
  borderRadius: 16,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
}

function StatCard({ label, value, icon: Icon, color, bg }: { 
  label: string; value: string | number; icon: any; color: string; bg: string 
}) {
  return (
    <div style={card} className="p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bg }}>
        <Icon size={20} style={{ color }} strokeWidth={2} />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-tight" style={{ color: '#1D1D1F', letterSpacing: '-0.02em' }}>{value}</p>
        <p className="text-xs mt-0.5 font-medium" style={{ color: '#6E6E73' }}>{label}</p>
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
    <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full"
      style={{ color, background: bg }}>{pct}%</span>
  )
}

export default function Dashboard() {
  const [liveEvents, setLiveEvents] = useState<DetectionEvent[]>([])
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([])
  const { data: eventsData } = useSWR('/api/events?limit=20', fetcher, { refreshInterval: 30000 })
  const { data: alerts }      = useSWR('/api/alerts?acknowledged=false', fetcher, { refreshInterval: 10000 })
  const { data: persons }     = useSWR('/api/persons', fetcher)
  const { data: watchlist }   = useSWR('/api/watchlist?activeOnly=true', fetcher)

  const { connected } = useSSE<DetectionEvent>('/api/events/stream', ev => 
    setLiveEvents(p => [ev, ...p].slice(0, 30)))

  useSSE<Alert>('/api/alerts/stream', alert => 
    setLiveAlerts(p => [alert, ...p].slice(0, 10)))

  const allEvents: DetectionEvent[] = liveEvents.length > 0 ? liveEvents : (eventsData?.data ?? [])
  const todayCount = allEvents.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString()).length

  return (
    <>
      <TopBar title="Dashboard" subtitle="Real-time monitoring" connected={connected} />
      <main className="flex-1 p-6 space-y-5">

        {/* Stat row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Detections Today"   value={todayCount || allEvents.length} icon={Car}         color="#007AFF" bg="rgba(0,122,255,0.1)" />
          <StatCard label="Registered Persons" value={persons?.length ?? '—'}         icon={Users}       color="#5856D6" bg="rgba(88,86,214,0.1)" />
          <StatCard label="Active Alerts"      value={alerts?.length ?? '—'}          icon={Bell}        color="#FF3B30" bg="rgba(255,59,48,0.1)" />
          <StatCard label="Watchlist Entries"  value={watchlist?.length ?? '—'}       icon={ShieldAlert} color="#FF9500" bg="rgba(255,149,0,0.1)" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Live feed */}
          <div className="lg:col-span-2" style={card}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(60,60,67,0.08)' }}>
              <div className="flex items-center gap-2.5">
                <TrendingUp size={16} strokeWidth={2} style={{ color: '#007AFF' }} />
                <span className="font-semibold text-sm" style={{ color: '#1D1D1F' }}>Live Detection Feed</span>
              </div>
              {connected && (
                <div className="flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: '#30D158' }}>
                  <span className="live-ring" />
                  Live
                </div>
              )}
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {allEvents.length === 0 ? (
                <div className="py-16 text-center">
                  <Car size={28} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: '#C7C7CC' }} />
                  <p className="text-sm font-medium" style={{ color: '#AEAEB2' }}>No detections yet</p>
                </div>
              ) : allEvents.map((ev, i) => (
                <div key={ev.id ?? i}
                  className="flex items-center gap-3 px-5 py-3 transition-colors"
                  style={{ borderBottom: '1px solid rgba(60,60,67,0.06)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.018)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {ev.thumbnailBase64
                    ? <img src={`data:image/jpeg;base64,${ev.thumbnailBase64}`} alt={ev.plateText}
                        className="w-16 h-9 object-cover rounded-lg flex-shrink-0"
                        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }} />
                    : <div className="w-16 h-9 flex-shrink-0 rounded-lg flex items-center justify-center"
                        style={{ background: '#F2F2F7' }}>
                        <Car size={14} strokeWidth={1.5} style={{ color: '#C7C7CC' }} />
                      </div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="plate-badge">{ev.plateText}</span>
                      <ConfBadge v={ev.confidence} />
                    </div>
                    {ev.personName && (
                      <p className="text-xs font-medium mt-1" style={{ color: '#007AFF' }}>● {ev.personName}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono tabular-nums" style={{ color: '#AEAEB2' }}>
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </p>
                    <span className="text-xs font-medium mt-0.5 inline-block px-1.5 py-0.5 rounded"
                      style={{ color: ev.source === 'video' ? '#5856D6' : '#6E6E73', background: ev.source === 'video' ? 'rgba(88,86,214,0.08)' : 'rgba(60,60,67,0.06)' }}>
                      {ev.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Alerts */}
          <div style={card}>
            <div className="flex items-center gap-2.5 px-5 py-4"
              style={{ borderBottom: '1px solid rgba(60,60,67,0.08)' }}>
              <Zap size={16} strokeWidth={2} style={{ color: '#FF3B30' }} />
              <span className="font-semibold text-sm" style={{ color: '#1D1D1F' }}>Active Alerts</span>
              {(alerts?.length ?? 0) > 0 && (
                <span className="ml-auto text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center"
                  style={{ background: '#FF3B30' }}>
                  {alerts.length}
                </span>
              )}
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {(liveAlerts.length > 0 ? liveAlerts : alerts ?? []).length === 0 ? (
                <div className="py-16 text-center">
                  <Bell size={28} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: '#C7C7CC' }} />
                  <p className="text-sm font-medium" style={{ color: '#AEAEB2' }}>No active alerts</p>
                </div>
              ) : (liveAlerts.length > 0 ? liveAlerts : alerts ?? []).map((a: Alert, i: number) => (
                <div key={a.id ?? i} className="px-5 py-4 transition-colors"
                  style={{ borderBottom: '1px solid rgba(60,60,67,0.06)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.018)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0 pulse-dot"
                      style={{ background: '#FF3B30' }} />
                    <div className="min-w-0">
                      <span className="plate-badge">{a.plateText}</span>
                      {a.reason && (
                        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#6E6E73' }}>{a.reason}</p>
                      )}
                      <p className="text-xs mt-1.5 tabular-nums" style={{ color: '#AEAEB2' }}>
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
