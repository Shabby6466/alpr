'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { BarChart3, Users, Car, Target, ChevronRight, Palette, Wifi, Camera, Image } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const card = {
  background: '#FFFFFF',
  borderRadius: 20,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
}

const SOURCE_ICONS: Record<string, typeof Camera> = {
  camera: Wifi,
  stream: Wifi,
  video: Image,
  image: Camera,
}

const SOURCE_COLORS: Record<string, string> = {
  camera: '#30D158',
  stream: '#007AFF',
  video: '#FF9500',
  image: '#5856D6',
}

const COLOR_MAP: Record<string, string> = {
  white: '#F2F2F7', silver: '#C7C7CC', gray: '#8E8E93', grey: '#8E8E93',
  black: '#1D1D1F', red: '#FF3B30', blue: '#007AFF', green: '#30D158',
  yellow: '#FFD60A', orange: '#FF9500', brown: '#A2845E', maroon: '#8B0000',
}

function MiniTrendChart({ data }: { data: { time: string; count: number }[] }) {
  if (!data || data.length < 2) return (
    <div className="h-32 flex items-center justify-center text-slate-200 text-sm">No data yet</div>
  )
  const max = Math.max(...data.map(d => d.count), 1)
  const W = 400, H = 80
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * W},${H - (d.count / max) * H}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H + 4}`} className="w-full h-32 overflow-visible">
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#007AFF" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#007AFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M 0,${H} L ${pts} L ${W},${H} Z`} fill="url(#cg)" />
      <polyline fill="none" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  )
}

function HBar({ label, value, max, color }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-slate-500 w-24 truncate capitalize">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color ?? '#007AFF' }} />
      </div>
      <span className="text-xs font-black text-slate-700 w-8 text-right">{value}</span>
    </div>
  )
}

export default function ReportsPage() {
  const [days, setDays] = useState(7)
  const { data: stats = [] } = useSWR<{ time: string; count: number }[]>(`/api/events/stats?days=${days}`, fetcher)
  const { data: topPlates = [] } = useSWR<any[]>('/api/events/top-plates?limit=10', fetcher)
  const { data: topPersons = [] } = useSWR<any[]>('/api/events/top-persons?limit=10', fetcher)
  const { data: vehicleStats } = useSWR<{ makes: any[]; colors: any[] }>(`/api/events/vehicle-stats?days=${days}`, fetcher)
  const { data: sourceBreakdown = [] } = useSWR<any[]>(`/api/events/source-breakdown?days=${days}`, fetcher)

  const total = stats.reduce((s, d) => s + d.count, 0)
  const avgPerHour = total > 0 ? (total / (days * 24)).toFixed(1) : '0'
  const makes = vehicleStats?.makes ?? []
  const colors = vehicleStats?.colors ?? []
  const maxMakeCount = makes.length ? makes[0].count : 1
  const maxColorCount = colors.length ? colors[0].count : 1
  const totalSource = sourceBreakdown.reduce((s, d) => s + parseInt(d.count), 0)

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <TopBar title="Analytics & Reports" subtitle="Historical intelligence and pattern recognition" connected={false} />

      <main className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Time window selector */}
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex p-1 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-white/50">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${days === d ? 'bg-white text-[#007AFF] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Trend + efficiency */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div style={card} className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detection Volume</p>
                <p className="text-3xl font-black tracking-tighter mt-0.5" style={{ color: '#1D1D1F' }}>
                  {total.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Throughput</p>
                <p className="text-xl font-black text-slate-800">{avgPerHour}/hr</p>
              </div>
            </div>
            <MiniTrendChart data={stats} />
            <div className="flex justify-between mt-3">
              {stats.filter((_, i) => i % Math.max(1, Math.ceil(stats.length / 6)) === 0).map((s, i) => (
                <span key={i} className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                  {new Date(s.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              ))}
            </div>
          </div>

          {/* Source breakdown */}
          <div style={card} className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 size={17} className="text-[#FF9500]" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detection Sources</p>
            </div>
            {sourceBreakdown.length === 0 ? (
              <p className="text-slate-300 text-sm text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-4">
                {sourceBreakdown.map((s: any) => {
                  const Icon = SOURCE_ICONS[s.source] ?? Camera
                  const color = SOURCE_COLORS[s.source] ?? '#8E8E93'
                  const pct = totalSource > 0 ? Math.round((parseInt(s.count) / totalSource) * 100) : 0
                  return (
                    <div key={s.source} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                        <Icon size={13} style={{ color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="capitalize text-slate-600">{s.source}</span>
                          <span className="text-slate-800">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-500 w-10 text-right">{s.count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Vehicle intelligence */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Makes */}
          <div style={card} className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Car size={17} className="text-[#007AFF]" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle Makes</p>
            </div>
            {makes.length === 0 ? (
              <p className="text-slate-300 text-sm text-center py-6">Enable object detection to collect vehicle data</p>
            ) : (
              <div className="space-y-3">
                {makes.map((m: any) => (
                  <HBar key={m.make} label={m.make} value={parseInt(m.count)} max={maxMakeCount} color="#007AFF" />
                ))}
              </div>
            )}
          </div>

          {/* Colors */}
          <div style={card} className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Palette size={17} className="text-[#5856D6]" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle Colors</p>
            </div>
            {colors.length === 0 ? (
              <p className="text-slate-300 text-sm text-center py-6">Enable object detection to collect color data</p>
            ) : (
              <div className="space-y-3">
                {colors.map((c: any) => {
                  const bg = COLOR_MAP[c.color?.toLowerCase()] ?? '#8E8E93'
                  return (
                    <div key={c.color} className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border border-slate-200 flex-shrink-0" style={{ background: bg }} />
                      <HBar label={c.color} value={parseInt(c.count)} max={maxColorCount} color={bg === '#F2F2F7' ? '#C7C7CC' : bg} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div style={card} className="overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-3">
              <Car size={17} className="text-[#007AFF]" />
              <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Most Frequent Plates</p>
            </div>
            <div className="divide-y divide-slate-50">
              {topPlates.length === 0 ? (
                <p className="p-10 text-center text-slate-300 text-sm">No data yet</p>
              ) : topPlates.map((p, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-slate-200 w-5">{i + 1}</span>
                    <span className="plate-badge">{p.plate}</span>
                  </div>
                  <span className="text-xs font-black text-slate-800">{p.count} <span className="text-[10px] text-slate-400 font-bold">hits</span></span>
                </div>
              ))}
            </div>
          </div>

          <div style={card} className="overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-3">
              <Users size={17} className="text-[#5856D6]" />
              <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Identified Subjects</p>
            </div>
            <div className="divide-y divide-slate-50">
              {topPersons.length === 0 ? (
                <p className="p-10 text-center text-slate-300 text-sm">No identified persons yet</p>
              ) : topPersons.map((p, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors group">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-slate-200 w-5">{i + 1}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{p.name || 'Unknown'}</p>
                      <p className="text-[10px] font-bold text-slate-400 font-mono">{p.id?.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-800">{p.count} <span className="text-[10px] text-slate-400 font-bold">IDs</span></span>
                    <ChevronRight size={13} className="text-slate-200 group-hover:text-[#007AFF] transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
