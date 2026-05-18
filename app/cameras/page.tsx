'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import TopBar from '@/components/ui/TopBar'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { Camera } from '@/types'
import { Video, Plus, Trash2, Power, Edit3, Wifi, WifiOff, ChevronRight, Activity } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const card = {
  background: '#FFFFFF',
  borderRadius: 20,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
}

const REGIONS = ['NORTH_AMERICAN', 'EUROPEAN', 'MIDDLE_EASTERN', 'ASIAN', 'PACIFIC', 'AFRICAN', 'SOUTH_AMERICAN']

const REGION_LABELS: Record<string, string> = {
  NORTH_AMERICAN: 'North American / Pakistan ★',
  EUROPEAN: 'European',
  PACIFIC: 'Pacific',
  ASIAN: 'Asian (East Asia)',
  MIDDLE_EASTERN: 'Middle Eastern',
  AFRICAN: 'African',
  SOUTH_AMERICAN: 'South American',
}

function StatusDot({ active, streaming }: { active: boolean; streaming?: boolean }) {
  if (!active) return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
      <span className="w-2 h-2 rounded-full bg-slate-300" /> Inactive
    </span>
  )
  if (streaming) return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#30D158] uppercase tracking-wider">
      <span className="w-2 h-2 rounded-full bg-[#30D158] pulse-dot" /> Live
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#FF9500] uppercase tracking-wider">
      <span className="w-2 h-2 rounded-full bg-[#FF9500]" /> Connecting
    </span>
  )
}

const blank = { name: '', url: '', region: 'NORTH_AMERICAN', frameStep: 5, notes: '' }

export default function CamerasPage() {
  const { data: cameras = [], isLoading } = useSWR<Camera[]>('/api/cameras', fetcher, { refreshInterval: 5000 })
  const [showAdd, setShowAdd] = useState(false)
  const [editCamera, setEditCamera] = useState<Camera | null>(null)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  function openAdd() { setForm(blank); setShowAdd(true) }
  function openEdit(c: Camera) {
    setForm({ name: c.name, url: c.url, region: c.region, frameStep: c.frameStep, notes: c.notes ?? '' })
    setEditCamera(c)
  }
  function closeModal() { setShowAdd(false); setEditCamera(null) }

  async function save() {
    if (!form.name.trim() || !form.url.trim()) return toast('Name and URL are required', 'error')
    setSaving(true)
    try {
      if (editCamera) {
        await api.updateCamera(editCamera.id, form)
        toast('Camera updated')
      } else {
        await api.createCamera({ ...form, active: true })
        toast('Camera added and stream started')
      }
      mutate('/api/cameras')
      closeModal()
    } catch (e: any) {
      toast(e.message ?? 'Failed to save camera', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(camera: Camera) {
    try {
      await api.updateCamera(camera.id, { active: !camera.active })
      mutate('/api/cameras')
      toast(camera.active ? 'Camera paused' : 'Camera resumed and stream started')
    } catch (e: any) {
      toast(e.message ?? 'Failed to update camera', 'error')
    }
  }

  async function remove(camera: Camera) {
    if (!confirm(`Remove camera "${camera.name}"? This stops the stream permanently.`)) return
    try {
      await api.deleteCamera(camera.id)
      mutate('/api/cameras')
      toast('Camera removed')
    } catch (e: any) {
      toast(e.message ?? 'Failed to remove camera', 'error')
    }
  }

  const active = cameras.filter(c => c.active).length
  const streaming = cameras.filter(c => c.streaming).length

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <TopBar title="Camera Management" subtitle="Persistent stream workers with auto-reconnect" connected={streaming > 0} />

      <main className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4">
          {[
            { label: 'Total Cameras', value: cameras.length, color: '#007AFF' },
            { label: 'Active', value: active, color: '#30D158' },
            { label: 'Streaming', value: streaming, color: '#FF9500' },
          ].map(s => (
            <div key={s.label} style={card} className="p-5 flex flex-col gap-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              <p className="text-3xl font-black tracking-tighter" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-800 tracking-tight">Registered Cameras</h2>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ background: '#007AFF' }}>
            <Plus size={16} strokeWidth={2.5} />
            Add Camera
          </button>
        </div>

        {/* Camera list */}
        {isLoading ? (
          <div style={card} className="p-12 text-center text-slate-300 text-sm">Loading cameras...</div>
        ) : cameras.length === 0 ? (
          <div style={card} className="p-16 text-center">
            <Video size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-semibold text-sm">No cameras registered</p>
            <p className="text-slate-300 text-xs mt-1">Add an RTSP or HTTP stream to start continuous monitoring</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cameras.map(camera => (
              <div key={camera.id} style={{ ...card, borderLeft: camera.streaming ? '3px solid #30D158' : camera.active ? '3px solid #FF9500' : '3px solid #E5E5EA' }}
                className="p-5 flex items-center gap-4 animate-in fade-in">

                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: camera.streaming ? 'rgba(48,209,88,0.1)' : 'rgba(142,142,147,0.1)' }}>
                  {camera.streaming
                    ? <Wifi size={18} className="text-[#30D158]" />
                    : <WifiOff size={18} className="text-slate-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-slate-800 truncate">{camera.name}</p>
                    <StatusDot active={camera.active} streaming={camera.streaming} />
                  </div>
                  <p className="text-xs text-slate-400 font-mono truncate">{camera.url}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{REGION_LABELS[camera.region] ?? camera.region}</span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">·</span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Every {camera.frameStep} frames</span>
                    {camera.notes && <>
                      <span className="text-[10px] font-bold text-slate-300">·</span>
                      <span className="text-[10px] text-slate-300 truncate max-w-[200px]">{camera.notes}</span>
                    </>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(camera)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-slate-100">
                    <Edit3 size={15} className="text-slate-400" />
                  </button>
                  <button onClick={() => toggleActive(camera)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-slate-100">
                    <Power size={15} className={camera.active ? 'text-[#30D158]' : 'text-slate-300'} />
                  </button>
                  <button onClick={() => remove(camera)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-red-50">
                    <Trash2 size={15} className="text-slate-300 hover:text-[#FF3B30]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit modal */}
      <Modal open={showAdd || editCamera !== null} onClose={closeModal}
        title={editCamera ? `Edit: ${editCamera.name}` : 'Add Camera Stream'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Camera Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
              placeholder="Entrance Gate 1" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Stream URL</label>
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
              placeholder="rtsp://admin:pass@192.168.1.100:554/stream1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Region</label>
              <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 bg-white">
                {REGIONS.map(r => <option key={r} value={r}>{REGION_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Frame Step</label>
              <input type="number" min={1} max={30} value={form.frameStep}
                onChange={e => setForm(f => ({ ...f, frameStep: parseInt(e.target.value) || 5 }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                placeholder="5" />
              <p className="text-[10px] text-slate-400 mt-1">Process every Nth frame (1–30)</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes (optional)</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
              placeholder="Location description, mounting angle, etc." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={closeModal}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: '#007AFF' }}>
              {saving ? 'Saving...' : editCamera ? 'Save Changes' : 'Add & Start Stream'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
