'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { WatchlistEntry } from '@/types'
import { Plus, Trash2, ShieldAlert, ToggleLeft, ToggleRight, Clock, ShieldCheck } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const inputStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(60,60,67,0.1)',
  borderRadius: 12,
  padding: '10px 14px',
  color: '#1D1D1F',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
  transition: 'all 0.2s ease',
}

const appleCard = {
  background: '#FFFFFF',
  borderRadius: 20,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
  transition: 'all 0.2s ease',
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

  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#8E8E93', marginBottom: 6, marginLeft: 4, letterSpacing: '0.04em', textTransform: 'uppercase' as const }

  return (
    <div className="space-y-5">
      <div>
        <label style={labelStyle}>Target License Plate</label>
        <input value={plate} onChange={e => setPlate(e.target.value.toUpperCase())}
          style={{ ...inputStyle, fontFamily: 'SF Mono, monospace', letterSpacing: '0.1em', fontWeight: 700 }}
          className="focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500"
          placeholder="MH20EE7602" />
      </div>
      <div>
        <label style={labelStyle}>Priority / Reason</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
          style={{ ...inputStyle, resize: 'none' }}
          className="focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500"
          placeholder="Stolen vehicle, suspect vehicle, etc." />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={submit} className="btn-apple flex-1 bg-[#FF9500]">
          Add to Watchlist
        </button>
        <button onClick={onCancel}
          className="px-6 rounded-xl text-sm font-semibold transition-all hover:bg-slate-100 text-slate-400">
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
    <div style={appleCard} className={`p-5 flex flex-col group hover:scale-[1.01] ${!isActive ? 'opacity-50 grayscale-[0.5]' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
            style={{
              background: isActive ? 'rgba(255,149,0,0.1)' : 'rgba(142,142,147,0.1)',
            }}>
            <ShieldAlert size={18} style={{ color: isActive ? '#FF9500' : '#8E8E93' }} />
          </div>
          <span className="plate-badge text-sm">{entry.plateText}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={onToggle} title={entry.active ? 'Deactivate' : 'Activate'}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: isActive ? '#FF9500' : '#8E8E93' }}>
            {isActive ? <ToggleRight size={22} strokeWidth={2.5} /> : <ToggleLeft size={22} strokeWidth={2.5} />}
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg transition-all text-slate-300 hover:text-[#FF3B30] hover:bg-red-50 opacity-0 group-hover:opacity-100">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {entry.reason && (
        <p className="text-xs font-medium mb-4 leading-relaxed line-clamp-2" style={{ color: '#6E6E73' }}>{entry.reason}</p>
      )}

      <div className="flex items-center justify-between pt-4 mt-auto" style={{ borderTop: '1px solid rgba(60,60,67,0.06)' }}>
        <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tight"
          style={isActive
            ? { color: '#FF9500', background: 'rgba(255,149,0,0.1)' }
            : { color: '#8E8E93', background: '#F2F2F7' }}>
          {isActive ? 'Monitoring' : 'Suspended'}
        </span>
        <p className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
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
    try { await api.createWatchlist(data); toast('Vehicle added to secure watchlist', 'success'); mutate(); setAddOpen(false) }
    catch (e: any) { toast(e.message, 'error') }
  }

  const toggle = async (entry: WatchlistEntry) => {
    try { await api.updateWatchlist(entry.id, { active: !entry.active }); toast(entry.active ? 'Monitoring suspended' : 'Monitoring resumed', 'info'); mutate() }
    catch (e: any) { toast(e.message, 'error') }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this vehicle from the watchlist?')) return
    try { await api.deleteWatchlist(id); toast('Target removed', 'info'); mutate() }
    catch (e: any) { toast(e.message, 'error') }
  }

  const activeCount = entries.filter(e => e.active).length

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <TopBar title="Secure Watchlist" subtitle={`${activeCount} high-priority targets`} connected={false} />
      
      <main className="flex-1 p-6 max-w-6xl mx-auto space-y-6">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex p-1 bg-white/50 backdrop-blur-md rounded-2xl shadow-sm border border-white/50">
             <button onClick={() => setActiveOnly(false)}
               className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${!activeOnly ? 'bg-white text-[#FF9500] shadow-sm' : 'text-slate-400'}`}>
               All Targets
             </button>
             <button onClick={() => setActiveOnly(true)}
               className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeOnly ? 'bg-white text-[#FF9500] shadow-sm' : 'text-slate-400'}`}>
               Active Only
             </button>
          </div>

          <button onClick={() => setAddOpen(true)} className="btn-apple h-10 px-6 flex items-center gap-2 bg-[#FF9500] shadow-md">
            <Plus size={18} strokeWidth={2.5} />
            Target Vehicle
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-[32px] py-32 text-center bg-white shadow-sm border border-slate-100 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
               <ShieldCheck size={32} className="text-slate-200" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-bold text-slate-800">Clear Watchlist</p>
            <p className="text-sm text-slate-400 mt-1">No vehicles are currently marked for interception.</p>
            <button onClick={() => setAddOpen(true)} className="mt-6 text-sm font-bold text-[#FF9500] hover:underline">
              Add first target vehicle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {entries.map(e => (
              <WatchlistCard key={e.id} entry={e} onToggle={() => toggle(e)} onDelete={() => remove(e.id)} />
            ))}
          </div>
        )}
      </main>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Target Vehicle Registration">
        <WatchlistForm onSave={create} onCancel={() => setAddOpen(false)} />
      </Modal>
    </div>
  )
}
