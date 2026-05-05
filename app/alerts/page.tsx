'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import { useSSE } from '@/lib/useSSE'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { Alert } from '@/types'
import { Bell, BellOff, Trash2, CheckCheck, ShieldAlert, Clock, Filter } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function AlertRow({ alert, onAck, onDelete }: {
  alert: Alert
  onAck: () => void
  onDelete: () => void
}) {
  return (
    <tr className={`hover:bg-slate-50 transition-colors ${alert.acknowledged ? 'opacity-50' : ''}`}>
      <td className="px-4 py-3">
        {alert.thumbnailBase64
          ? <img
              src={`data:image/jpeg;base64,${alert.thumbnailBase64}`}
              alt={alert.plateText}
              className="w-16 h-9 object-cover rounded border border-slate-200 bg-slate-100"
            />
          : <div className="w-16 h-9 bg-slate-100 rounded border border-slate-200 flex items-center justify-center">
              <ShieldAlert size={14} className="text-slate-300" />
            </div>}
      </td>
      <td className="px-4 py-3">
        <span className="plate-badge">{alert.plateText}</span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px]">
        {alert.reason ?? <span className="text-slate-300">—</span>}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${alert.acknowledged ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-600'}`}>
          {alert.acknowledged ? 'Acknowledged' : 'Active'}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {new Date(alert.timestamp).toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {!alert.acknowledged && (
            <button
              onClick={onAck}
              title="Acknowledge"
              className="p-1.5 text-slate-400 hover:text-green-500 rounded hover:bg-green-50 transition-colors">
              <CheckCheck size={14} />
            </button>
          )}
          <button
            onClick={onDelete}
            title="Delete"
            className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-red-50 transition-colors">
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
    try {
      await api.acknowledgeAlert(id)
      toast('Alert acknowledged', 'success')
      mutate()
    } catch (e: any) { toast(e.message, 'error') }
  }

  const del = async (id: string) => {
    try {
      await api.deleteAlert(id)
      toast('Alert deleted', 'info')
      mutate()
    } catch (e: any) { toast(e.message, 'error') }
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
      <TopBar
        title="Alerts"
        subtitle={activeCount > 0 ? `${activeCount} unacknowledged` : 'All clear'}
        connected={connected}
      />
      <main className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setShowAcknowledged(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${showAcknowledged ? 'bg-blue-500' : 'bg-slate-200'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showAcknowledged ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-slate-600 font-medium flex items-center gap-1.5">
              <BellOff size={14} />Show acknowledged
            </span>
          </label>
          <div className="flex-1" />
          {activeCount > 0 && (
            <button
              onClick={ackAll}
              className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium px-3 py-2 rounded-lg hover:bg-green-50 border border-green-200 transition-colors">
              <CheckCheck size={15} />Acknowledge all ({activeCount})
            </button>
          )}
        </div>

        {/* Live banner */}
        {liveCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full pulse-dot" />
            <span className="text-sm text-red-700 font-medium">
              {liveCount} new alert{liveCount > 1 ? 's' : ''} received
            </span>
            <button
              onClick={() => { setLiveCount(0); mutate() }}
              className="ml-auto text-xs text-red-600 hover:text-red-800 font-medium">
              Refresh
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Thumbnail</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plate</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Triggered</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {alerts.length === 0
                ? <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Bell size={36} className="mx-auto text-slate-200 mb-3" />
                      <p className="text-slate-400 font-medium">No alerts</p>
                    </td>
                  </tr>
                : alerts.map(a => (
                    <AlertRow
                      key={a.id}
                      alert={a}
                      onAck={() => ack(a.id)}
                      onDelete={() => del(a.id)}
                    />
                  ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
}
