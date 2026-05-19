'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { useSSE } from '@/lib/useSSE'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { Alert } from '@/types'
import { Bell, BellOff, Trash2, CheckCheck, ShieldAlert, Clock, ChevronRight } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const appleCard = {
  background: '#FFFFFF',
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
}

function AlertRow({ alert, onAck, onDelete }: {
  alert: Alert; onAck: () => void; onDelete: () => void
}) {
  return (
    <tr className={`transition-all hover:bg-slate-50/50 group ${alert.acknowledged ? 'opacity-40' : ''}`}>
      <td className="px-5 py-3">
        {alert.thumbnailBase64
          ? <img src={`data:image/jpeg;base64,${alert.thumbnailBase64}`} alt={alert.plateText}
              className="w-16 h-10 object-cover rounded-xl shadow-sm border border-white" />
          : <div className="w-16 h-10 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-100">
              <ShieldAlert size={14} className="text-slate-200" />
            </div>}
      </td>
      <td className="px-5 py-3"><span className="plate-badge text-[11px]">{alert.plateText}</span></td>
      <td className="px-5 py-3 text-xs font-medium max-w-[200px] truncate text-slate-600">
        {alert.reason ?? '—'}
      </td>
      <td className="px-5 py-3">
        {alert.acknowledged ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter"
            style={{ color: '#8E8E93', background: '#F2F2F7' }}>
            Resolved
          </span>
        ) : (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tight flex items-center gap-1.5"
            style={{ color: '#FF3B30', background: 'rgba(255,59,48,0.1)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] pulse-dot" />
            Critical
          </span>
        )}
      </td>
      <td className="px-5 py-3">
        <div className="flex flex-col">
           <span className="text-[11px] font-bold text-slate-800">
             {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </span>
           <span className="text-[9px] font-bold text-slate-400 uppercase">
             {new Date(alert.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
           </span>
        </div>
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          {!alert.acknowledged && (
            <button onClick={onAck} title="Acknowledge"
              className="p-1.5 rounded-lg transition-all text-slate-300 hover:text-[#30D158] hover:bg-emerald-50">
              <CheckCheck size={16} strokeWidth={2.5} />
            </button>
          )}
          <button onClick={onDelete} title="Delete"
            className="p-1.5 rounded-lg transition-all text-slate-300 hover:text-[#FF3B30] hover:bg-red-50">
            <Trash2 size={16} strokeWidth={2.5} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function AlertsPage() {
  const { toast } = useToast()
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const [liveCount, setLiveCount] = useState(0)

  const qs = showAcknowledged ? '' : '?acknowledged=false'
  const { data: alerts = [], mutate } = useSWR<Alert[]>(`/api/alerts${qs}`, fetcher)

  const { connected } = useSSE<Alert>('/api/alerts/stream', () => {
    setLiveCount(n => n + 1)
    mutate()
  })

  const ack = async (id: string) => {
    try { await api.acknowledgeAlert(id); toast('Alert acknowledged', 'success'); mutate() }
    catch (e: any) { toast(e.message, 'error') }
  }

  const del = async (id: string) => {
    if (!confirm('Permanently delete this alert?')) return
    try { await api.deleteAlert(id); toast('Alert removed', 'info'); mutate() }
    catch (e: any) { toast(e.message, 'error') }
  }

  const ackAll = async () => {
    const unacked = alerts.filter(a => !a.acknowledged)
    if (unacked.length === 0) return
    await Promise.all(unacked.map(a => api.acknowledgeAlert(a.id)))
    toast(`Resolved ${unacked.length} pending alert${unacked.length > 1 ? 's' : ''}`, 'success')
    mutate()
  }

  const activeCount = alerts.filter(a => !a.acknowledged).length

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <TopBar title="Active Alerts" subtitle={activeCount > 0 ? `${activeCount} urgent items pending` : 'System fully cleared'} connected={connected} />
      
      <main className="flex-1 p-6 max-w-6xl mx-auto space-y-6">

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <button 
            onClick={() => setShowAcknowledged(!showAcknowledged)}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${showAcknowledged ? 'bg-white shadow-sm text-[#007AFF] border border-white' : 'bg-slate-200/50 text-slate-400'}`}>
            {showAcknowledged ? <Bell size={15} /> : <BellOff size={15} />}
            {showAcknowledged ? 'Showing All Records' : 'Filter: Unresolved Only'}
          </button>
          
          {activeCount > 0 && (
            <button onClick={ackAll}
              className="btn-apple flex items-center gap-2 px-6 h-10 shadow-md bg-[#30D158]">
              <CheckCheck size={16} strokeWidth={2.5} />
              Resolve All
            </button>
          )}
        </div>

        {/* Live banner */}
        {liveCount > 0 && (
          <div className="rounded-2xl px-5 py-4 flex items-center gap-4 bg-red-50 border border-red-100 animate-in slide-in-from-top-4 duration-500 shadow-sm">
            <div className="live-ring" />
            <div>
              <p className="text-sm font-bold text-red-900">{liveCount} Priority Intercepts Detected</p>
              <p className="text-xs font-medium text-red-400">Immediate attention required in real-time monitor</p>
            </div>
            <button onClick={() => { setLiveCount(0); mutate() }}
              className="ml-auto text-xs font-black text-red-600 uppercase tracking-widest hover:underline">
              Sync Registry
            </button>
          </div>
        )}

        {/* Table */}
        <div style={appleCard} className="overflow-hidden border border-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['Detections', 'Result', 'Violation / Reason', 'Severity', 'Intercepted', ''].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[10px] font-black tracking-widest uppercase text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
                       <ShieldAlert size={32} className="text-slate-200" strokeWidth={1.5} />
                    </div>
                    <p className="text-lg font-bold text-slate-800">Clear Skies</p>
                    <p className="text-sm text-slate-400 mt-1">No security alerts currently active.</p>
                  </td>
                </tr>
              ) : (
                alerts.map(a => (
                  <AlertRow key={a.id} alert={a} onAck={() => ack(a.id)} onDelete={() => del(a.id)} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
