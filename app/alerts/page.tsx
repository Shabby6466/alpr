'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { useSSE } from '@/lib/useSSE'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { Alert } from '@/types'
import { Bell, BellOff, Trash2, CheckCheck, ShieldAlert, Clock } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function AlertRow({ alert, onAck, onDelete }: {
  alert: Alert; onAck: () => void; onDelete: () => void
}) {
  return (
    <tr className={`transition-colors hover:bg-white/[0.02] ${alert.acknowledged ? 'opacity-40' : ''}`}
      style={{ borderBottom: '1px solid #0a1525' }}>
      <td className="px-4 py-3">
        {alert.thumbnailBase64
          ? <img src={`data:image/jpeg;base64,${alert.thumbnailBase64}`} alt={alert.plateText}
              className="w-16 h-9 object-cover rounded-lg"
              style={{ border: '1px solid #1a2744' }} />
          : <div className="w-16 h-9 rounded-lg flex items-center justify-center"
              style={{ background: '#070e1c', border: '1px solid #0f1e38' }}>
              <ShieldAlert size={13} style={{ color: '#1e3358' }} />
            </div>}
      </td>
      <td className="px-4 py-3"><span className="plate-badge">{alert.plateText}</span></td>
      <td className="px-4 py-3 text-xs max-w-[180px]" style={{ color: '#475569' }}>
        {alert.reason ?? <span style={{ color: '#1e3358' }}>—</span>}
      </td>
      <td className="px-4 py-3">
        {alert.acknowledged ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ color: '#475569', background: 'rgba(71,85,105,0.15)', border: '1px solid rgba(71,85,105,0.2)' }}>
            Acknowledged
          </span>
        ) : (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ color: '#f87171', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
            ● Active
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: '#475569' }}>
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {new Date(alert.timestamp).toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {!alert.acknowledged && (
            <button onClick={onAck} title="Acknowledge"
              className="p-1.5 rounded-lg transition-colors text-slate-600 hover:text-green-400 hover:bg-green-950/40">
              <CheckCheck size={14} />
            </button>
          )}
          <button onClick={onDelete} title="Delete"
            className="p-1.5 rounded-lg transition-colors text-slate-700 hover:text-red-400 hover:bg-red-950/30">
            <Trash2 size={14} />
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
    try { await api.deleteAlert(id); toast('Alert deleted', 'info'); mutate() }
    catch (e: any) { toast(e.message, 'error') }
  }

  const ackAll = async () => {
    const unacked = alerts.filter(a => !a.acknowledged)
    if (unacked.length === 0) return
    await Promise.all(unacked.map(a => api.acknowledgeAlert(a.id)))
    toast(`Acknowledged ${unacked.length} alert${unacked.length > 1 ? 's' : ''}`, 'success')
    mutate()
  }

  const activeCount = alerts.filter(a => !a.acknowledged).length

  return (
    <>
      <TopBar title="Alerts" subtitle={activeCount > 0 ? `${activeCount} unacknowledged` : 'All clear'} connected={connected} />
      <main className="flex-1 p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div onClick={() => setShowAcknowledged(v => !v)}
              className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
              style={{ background: showAcknowledged ? '#3b82f6' : '#1a2744' }}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showAcknowledged ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-slate-400 font-medium flex items-center gap-1.5">
              <BellOff size={14} />Show acknowledged
            </span>
          </label>
          <div className="flex-1" />
          {activeCount > 0 && (
            <button onClick={ackAll}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              style={{ color: '#4ade80', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <CheckCheck size={15} />Acknowledge all ({activeCount})
            </button>
          )}
        </div>

        {/* Live banner */}
        {liveCount > 0 && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <span className="relative flex h-2 w-2">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-sm text-red-300 font-semibold">
              {liveCount} new alert{liveCount > 1 ? 's' : ''} received
            </span>
            <button onClick={() => { setLiveCount(0); mutate() }}
              className="ml-auto text-xs text-red-400 hover:text-red-200 font-semibold transition-colors">
              Refresh →
            </button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#0c1528', border: '1px solid #1a2744' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #1a2744', background: '#080f1e' }}>
                {['Thumbnail', 'Plate', 'Reason', 'Status', 'Triggered', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold tracking-widest uppercase"
                    style={{ color: '#334155' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0
                ? <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Bell size={36} className="mx-auto mb-3" style={{ color: '#1a2744' }} />
                      <p className="text-slate-600 text-sm">No alerts</p>
                    </td>
                  </tr>
                : alerts.map(a => (
                    <AlertRow key={a.id} alert={a} onAck={() => ack(a.id)} onDelete={() => del(a.id)} />
                  ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
}
