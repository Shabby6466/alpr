'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { api } from '@/lib/api'
import { BarChart3, Download, Calendar, Search, TrendingUp, Users, Car, Target, ChevronRight } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const appleCard = {
  background: '#FFFFFF',
  borderRadius: 20,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
}

interface StatData {
  time: string
  count: number
}

interface TopPlate {
  plate: string
  count: number
}

interface TopPerson {
  id: string
  name: string | null
  count: number
}

function MiniTrendChart({ data }: { data: StatData[] }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.count))
  const height = 100
  const width = 400
  const points = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - (d.count / max) * height}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#007AFF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#007AFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M 0,${height} L ${points} L ${width},${height} Z`} fill="url(#chartGradient)" />
      <polyline
        fill="none"
        stroke="#007AFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

export default function ReportsPage() {
  const [days, setDays] = useState(7)
  const { data: stats = [] } = useSWR<StatData[]>(`/api/events/stats?days=${days}`, fetcher)
  const { data: topPlates = [] } = useSWR<TopPlate[]>('/api/events/top-plates?limit=10', fetcher)
  const { data: topPersons = [] } = useSWR<TopPerson[]>('/api/events/top-persons?limit=10', fetcher)

  const totalDetections = stats.reduce((acc: number, s) => acc + s.count, 0)
  const avgPerHour = (totalDetections / (days * 24)).toFixed(1)

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <TopBar title="Analytics & Reports" subtitle="Historical intelligence and pattern recognition" connected={false} />
      
      <main className="flex-1 p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex p-1 bg-white/50 backdrop-blur-md rounded-2xl shadow-sm border border-white/50">
             {[7, 30, 90].map(d => (
               <button key={d} onClick={() => setDays(d)}
                 className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${days === d ? 'bg-white text-[#007AFF] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                 Last {d} Days
               </button>
             ))}
          </div>
          
          <button className="btn-apple flex items-center gap-2 h-10 px-6 shadow-md">
            <Download size={16} strokeWidth={2.5} />
            Export Full Report
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div style={appleCard} className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Detection Volume Trend</h3>
                  <p className="text-3xl font-black tracking-tighter mt-1" style={{ color: '#1D1D1F' }}>
                    {totalDetections.toLocaleString()} <span className="text-sm font-bold text-[#30D158] ml-2">↑ 12.4%</span>
                  </p>
               </div>
               <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase">Avg. Throughput</p>
                  <p className="text-lg font-black text-slate-800">{avgPerHour}/hr</p>
               </div>
            </div>
            
            <div className="relative pt-4">
               <MiniTrendChart data={stats} />
               <div className="flex justify-between mt-4">
                  {stats.filter((_, i) => i % (Math.ceil(stats.length / 6)) === 0).map((s, i) => (
                    <span key={i} className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                      {new Date(s.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  ))}
               </div>
            </div>
          </div>

          <div style={appleCard} className="p-6 flex flex-col justify-between">
             <div>
                <div className="flex items-center gap-2 mb-4">
                   <Target size={18} className="text-[#FF9500]" />
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">System Efficiency</h3>
                </div>
                <div className="space-y-6">
                   <div>
                      <div className="flex justify-between text-xs font-bold mb-2">
                         <span className="text-slate-500">Plate OCR Precision</span>
                         <span className="text-slate-900">98.2%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-[#30D158]" style={{ width: '98.2%' }} />
                      </div>
                   </div>
                   <div>
                      <div className="flex justify-between text-xs font-bold mb-2">
                         <span className="text-slate-500">Biometric Match Rate</span>
                         <span className="text-slate-900">74.5%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-[#007AFF]" style={{ width: '74.5%' }} />
                      </div>
                   </div>
                   <div>
                      <div className="flex justify-between text-xs font-bold mb-2">
                         <span className="text-slate-500">Stream Uptime</span>
                         <span className="text-slate-900">99.9%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-indigo-500" style={{ width: '99.9%' }} />
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="bg-slate-50 p-4 rounded-2xl mt-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Health Status</p>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-[#30D158] pulse-dot" />
                   <span className="text-xs font-bold text-slate-800 tracking-tight">GPU Core Temp: 42°C · Stable</span>
                </div>
             </div>
          </div>
        </div>

        {/* Rankings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Top Plates */}
          <div style={appleCard} className="overflow-hidden">
             <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-3">
                <Car size={18} className="text-[#007AFF]" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Most Frequent Vehicles</h3>
             </div>
             <div className="divide-y divide-slate-50">
                {topPlates.length === 0 ? (
                  <div className="p-12 text-center text-slate-300 italic text-sm">Insufficient data for ranking</div>
                ) : topPlates.map((p, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                     <div className="flex items-center gap-4">
                        <span className="text-xs font-black text-slate-200 w-4">{i + 1}</span>
                        <span className="plate-badge">{p.plate}</span>
                     </div>
                     <div className="text-right">
                        <p className="text-xs font-black text-slate-800">{p.count} <span className="text-[10px] text-slate-400 font-bold uppercase ml-0.5">Visits</span></p>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Top Persons */}
          <div style={appleCard} className="overflow-hidden">
             <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-3">
                <Users size={18} className="text-[#5856D6]" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Identified Subject Frequency</h3>
             </div>
             <div className="divide-y divide-slate-50">
                {topPersons.length === 0 ? (
                  <div className="p-12 text-center text-slate-300 italic text-sm">Insufficient data for ranking</div>
                ) : topPersons.map((p, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                     <div className="flex items-center gap-4">
                        <span className="text-xs font-black text-slate-200 w-4">{i + 1}</span>
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-slate-800 tracking-tight">{p.name || 'Anonymous Subject'}</span>
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{p.id.slice(0, 8)}</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="text-right">
                           <p className="text-xs font-black text-slate-800">{p.count} <span className="text-[10px] text-slate-400 font-bold uppercase ml-0.5">Identifications</span></p>
                        </div>
                        <ChevronRight size={14} className="text-slate-200 group-hover:text-[#007AFF] transition-all" />
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
