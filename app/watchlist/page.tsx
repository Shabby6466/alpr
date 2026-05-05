'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { WatchlistEntry } from '@/types'
import { Plus, Trash2, ShieldAlert, ToggleLeft, ToggleRight, Clock } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function WatchlistForm({ onSave, onCancel }: {
  onSave: (data: any) => void
  onCancel: () => void
}) {
  const [plate, setPlate] = useState('')
  const [reason, setReason] = useState('')

  const submit = () => {
    if (!plate.trim()) return
    onSave({ plateText: plate.trim().toUpperCase(), reason: reason.trim() || undefined })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">License Plate *</label>
        <input
          value={plate}
          onChange={e => setPlate(e.target.value.toUpperCase())}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 uppercase"
          placeholder="MH20EE7602"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Reason <span className="text-slate-400 font-normal">(optional)</span></label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={2}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          placeholder="Suspected vehicle, stolen plate, etc."
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={submit}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg py-2 text-sm font-medium transition-colors">
          Add to Watchlist
        </button>
        <button
          onClick={onCancel}
          className="px-4 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

function WatchlistCard({ entry, onToggle, onDelete }: {
  entry: WatchlistEntry
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className={`bg-white border rounded-xl p-5 transition-colors ${entry.active ? 'border-amber-200' : 'border-slate-200 opacity-60'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className={entry.active ? 'text-amber-500' : 'text-slate-400'} />
          <span className="plate-badge text-sm">{entry.plateText}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onToggle}
            title={entry.active ? 'Deactivate' : 'Activate'}
            className={`p-1.5 rounded transition-colors ${entry.active ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50' : 'text-slate-400 hover:text-green-500 hover:bg-green-50'}`}>
            {entry.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {entry.reason && (
        <p className="text-xs text-slate-500 mb-3">{entry.reason}</p>
      )}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${entry.active ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
          {entry.active ? 'Active' : 'Inactive'}
        </span>
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <Clock size={11} />
          {new Date(entry.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

export default function WatchlistPage() {
  const { toast } = useToast()
  const [activeOnly, setActiveOnly] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const qs = activeOnly ? '?activeOnly=true' : ''
  const { data: entries = [], mutate } = useSWR<WatchlistEntry[]>(`/api/watchlist${qs}`, fetcher)

  const create = async (data: any) => {
    try {
      await api.createWatchlist(data)
      toast('Plate added to watchlist', 'success')
      mutate(); setAddOpen(false)
    } catch (e: any) { toast(e.message, 'error') }
  }

  const toggle = async (entry: WatchlistEntry) => {
    try {
      await api.updateWatchlist(entry.id, { active: !entry.active })
      toast(entry.active ? 'Entry deactivated' : 'Entry activated', 'info')
      mutate()
    } catch (e: any) { toast(e.message, 'error') }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this watchlist entry?')) return
    try {
      await api.deleteWatchlist(id)
      toast('Removed', 'info')
      mutate()
    } catch (e: any) { toast(e.message, 'error') }
  }

  const activeCount = entries.filter(e => e.active).length

  return (
    <>
      <TopBar title="Watchlist" subtitle={`${activeCount} active entr${activeCount !== 1 ? 'ies' : 'y'}`} connected={false} />
      <main className="flex-1 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setActiveOnly(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${activeOnly ? 'bg-amber-500' : 'bg-slate-200'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${activeOnly ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-slate-600 font-medium">Active only</span>
          </label>
          <div className="flex-1" />
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} />Add to Watchlist
          </button>
        </div>

        {entries.length === 0
          ? <div className="bg-white border border-slate-200 rounded-xl py-20 text-center">
              <ShieldAlert size={36} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 font-medium">No watchlist entries yet</p>
              <button
                onClick={() => setAddOpen(true)}
                className="mt-3 text-sm text-amber-500 hover:text-amber-600 font-medium">
                Add the first plate →
              </button>
            </div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {entries.map(e => (
                <WatchlistCard
                  key={e.id}
                  entry={e}
                  onToggle={() => toggle(e)}
                  onDelete={() => remove(e.id)}
                />
              ))}
            </div>}
      </main>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add to Watchlist">
        <WatchlistForm onSave={create} onCancel={() => setAddOpen(false)} />
      </Modal>
    </>
  )
}
