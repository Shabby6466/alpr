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

const inputStyle = {
  background: '#07101e',
  border: '1px solid #1e3358',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#e2e8f0',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
}

const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: '#64748b', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' as const
}

function WatchlistForm({ onSave, onCancel }: {
  onSave: (data: any) => void; onCancel: () => void
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
        <label style={labelStyle}>License Plate *</label>
        <input value={plate} onChange={e => setPlate(e.target.value.toUpperCase())}
          style={{ ...inputStyle, fontFamily: 'Courier New, monospace', letterSpacing: '0.15em' }}
          placeholder="MH20EE7602" />
      </div>
      <div>
        <label style={labelStyle}>Reason <span style={{ color: '#334155', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Suspected vehicle, stolen plate, etc." />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={submit}
          className="flex-1 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
          style={{ background: '#d97706' }}>
          Add to Watchlist
        </button>
        <button onClick={onCancel}
          className="px-4 rounded-lg text-sm transition-colors"
          style={{ background: '#0c1528', border: '1px solid #1a2744', color: '#64748b' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function WatchlistCard({ entry, onToggle, onDelete }: {
  entry: WatchlistEntry; onToggle: () => void; onDelete: () => void
}) {
  const isActive = entry.active
  return (
    <div className="rounded-xl p-5 transition-all"
      style={{
        background: '#0c1528',
        border: `1px solid ${isActive ? 'rgba(245,158,11,0.3)' : '#1a2744'}`,
        opacity: isActive ? 1 : 0.55,
      }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: isActive ? 'rgba(245,158,11,0.15)' : 'rgba(71,85,105,0.15)',
              border: `1px solid ${isActive ? 'rgba(245,158,11,0.2)' : '#1a2744'}`,
            }}>
            <ShieldAlert size={15} style={{ color: isActive ? '#f59e0b' : '#475569' }} />
          </div>
          <span className="plate-badge text-sm">{entry.plateText}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={onToggle} title={entry.active ? 'Deactivate' : 'Activate'}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: isActive ? '#f59e0b' : '#475569' }}>
            {isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg transition-colors text-slate-700 hover:text-red-400 hover:bg-red-950/30">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {entry.reason && (
        <p className="text-xs mb-3 leading-relaxed" style={{ color: '#64748b' }}>{entry.reason}</p>
      )}

      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #0f1e38' }}>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={isActive
            ? { color: '#fbbf24', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }
            : { color: '#475569', background: 'rgba(71,85,105,0.1)', border: '1px solid #1a2744' }}>
          {isActive ? '● Active' : 'Inactive'}
        </span>
        <p className="text-xs flex items-center gap-1" style={{ color: '#1e3358' }}>
          <Clock size={10} />
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
    try { await api.createWatchlist(data); toast('Plate added to watchlist', 'success'); mutate(); setAddOpen(false) }
    catch (e: any) { toast(e.message, 'error') }
  }

  const toggle = async (entry: WatchlistEntry) => {
    try { await api.updateWatchlist(entry.id, { active: !entry.active }); toast(entry.active ? 'Entry deactivated' : 'Entry activated', 'info'); mutate() }
    catch (e: any) { toast(e.message, 'error') }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this watchlist entry?')) return
    try { await api.deleteWatchlist(id); toast('Removed', 'info'); mutate() }
    catch (e: any) { toast(e.message, 'error') }
  }

  const activeCount = entries.filter(e => e.active).length

  return (
    <>
      <TopBar title="Watchlist" subtitle={`${activeCount} active entr${activeCount !== 1 ? 'ies' : 'y'}`} connected={false} />
      <main className="flex-1 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div onClick={() => setActiveOnly(v => !v)}
              className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
              style={{ background: activeOnly ? '#d97706' : '#1a2744' }}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${activeOnly ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-slate-400 font-medium">Active only</span>
          </label>
          <div className="flex-1" />
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: '#d97706' }}>
            <Plus size={16} />Add to Watchlist
          </button>
        </div>

        {entries.length === 0
          ? <div className="rounded-xl py-24 text-center"
              style={{ background: '#0c1528', border: '1px solid #1a2744' }}>
              <ShieldAlert size={40} className="mx-auto mb-4" style={{ color: '#1a2744' }} />
              <p className="text-slate-600 font-medium">No watchlist entries</p>
              <button onClick={() => setAddOpen(true)}
                className="mt-3 text-sm font-semibold text-amber-500 hover:text-amber-400 transition-colors">
                Add the first plate →
              </button>
            </div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {entries.map(e => (
                <WatchlistCard key={e.id} entry={e} onToggle={() => toggle(e)} onDelete={() => remove(e.id)} />
              ))}
            </div>}
      </main>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add to Watchlist">
        <WatchlistForm onSave={create} onCancel={() => setAddOpen(false)} />
      </Modal>
    </>
  )
}
