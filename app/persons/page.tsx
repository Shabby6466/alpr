'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { Person } from '@/types'
import { Plus, Pencil, Trash2, Users, Clock, Car, User, Camera, Search, ChevronRight } from 'lucide-react'

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

function PersonForm({ initial, onSave, onCancel }: {
  initial?: Partial<Person>; onSave: (data: any) => void; onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [plates, setPlates] = useState((initial?.plateNumbers ?? ['']).join('\n'))
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const submit = () => {
    const plateNumbers = plates.split('\n').map(p => p.trim()).filter(Boolean)
    if (!name.trim() || plateNumbers.length === 0) return
    onSave({ name: name.trim(), plateNumbers, notes: notes.trim() || undefined })
  }

  const labelStyle = { 
    display: 'block', 
    fontSize: '11px', 
    fontWeight: 700, 
    color: '#8E8E93', 
    marginBottom: 6, 
    marginLeft: 4,
    letterSpacing: '0.04em', 
    textTransform: 'uppercase' as const 
  }

  return (
    <div className="space-y-5">
      <div>
        <label style={labelStyle}>Full Name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="e.g. Tim Cook" className="focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500" />
      </div>
      <div>
        <label style={labelStyle}>License Plates <span className="text-[10px] font-normal lowercase">(one per line)</span></label>
        <textarea value={plates} onChange={e => setPlates(e.target.value)} rows={3}
          style={{ ...inputStyle, fontFamily: 'SF Mono, monospace', resize: 'none' }}
          className="focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
          placeholder={'ABC-1234\nXYZ-9999'} />
      </div>
      <div>
        <label style={labelStyle}>Administrative Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          style={{ ...inputStyle, resize: 'none' }} 
          className="focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
          placeholder="Optional background details…" />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={submit} className="btn-apple flex-1">
          {initial?.id ? 'Save Changes' : 'Register Person'}
        </button>
        <button onClick={onCancel}
          className="px-6 rounded-xl text-sm font-semibold transition-all hover:bg-slate-100"
          style={{ color: '#8E8E93' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function PersonCard({ person, onEdit, onDelete, onView, onEnrollFace }: {
  person: Person; onEdit: () => void; onDelete: () => void; onView: () => void; onEnrollFace: () => void
}) {
  return (
    <div style={appleCard} className="p-5 flex flex-col group hover:scale-[1.01]">
      <div className="flex items-start gap-4 flex-1">
        <div className="w-20 h-20 rounded-[22px] flex-shrink-0 overflow-hidden flex items-center justify-center relative cursor-pointer shadow-inner bg-[#F2F2F7] border border-slate-100"
          onClick={onEnrollFace}>
          {(person as any).faceThumbnail ? (
            <img src={`data:image/jpeg;base64,${(person as any).faceThumbnail}`} alt={person.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105" />
          ) : (
            <User size={28} className="text-slate-300" strokeWidth={1.5} />
          )}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]"
            style={{ background: 'rgba(0,122,255,0.7)' }}>
            <Camera size={20} className="text-white drop-shadow-md" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-start justify-between">
            <h3 className="font-bold text-base tracking-tight text-[#1D1D1F] truncate">{person.name}</h3>
            <div className="flex gap-1">
               <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-300 hover:text-[#007AFF] hover:bg-blue-50 transition-all">
                 <Pencil size={14} />
               </button>
               <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-300 hover:text-[#FF3B30] hover:bg-red-50 transition-all">
                 <Trash2 size={14} />
               </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {person.plateNumbers.map(p => <span key={p} className="plate-badge text-[10px] py-0.5 px-2">{p}</span>)}
          </div>
          {person.notes && <p className="text-[11px] text-slate-400 mt-2 line-clamp-1 italic font-medium">"{person.notes}"</p>}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 mt-4" style={{ borderTop: '1px solid rgba(60,60,67,0.06)' }}>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
           <Clock size={10} />
           {new Date(person.createdAt).toLocaleDateString()}
        </div>
        <button onClick={onView}
          className="text-xs font-bold text-[#007AFF] flex items-center gap-1 hover:gap-2 transition-all">
          Activity <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

export default function PersonsPage() {
  const { toast } = useToast()
  const { data: persons = [], mutate } = useSWR<Person[]>('/api/persons', fetcher)
  const [addOpen, setAddOpen] = useState(false)
  const [editPerson, setEditPerson] = useState<Person | null>(null)
  const [viewPerson, setViewPerson] = useState<any | null>(null)
  const [search, setSearch] = useState('')
  const [enrollId, setEnrollId] = useState<string | null>(null)

  const handleEnroll = (id: string) => {
    setEnrollId(id)
    const input = document.getElementById('enroll-input') as HTMLInputElement
    input?.click()
  }

  const uploadFace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !enrollId) return
    try {
      const fd = new FormData()
      fd.append('image', file)
      await api.enrollFace(enrollId, fd)
      toast('Face biometric profile updated', 'success')
      mutate()
    } catch (e: any) { toast(e.message, 'error') }
    finally { setEnrollId(null); e.target.value = '' }
  }

  const filtered = persons.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.plateNumbers.some(pl => pl.toLowerCase().includes(search.toLowerCase()))
  )

  const create = async (data: any) => {
    try { await api.createPerson(data); toast('Person registered successfully', 'success'); mutate(); setAddOpen(false) }
    catch (e: any) { toast(e.message, 'error') }
  }

  const update = async (data: any) => {
    if (!editPerson) return
    try { await api.updatePerson(editPerson.id, data); toast('Profile updated', 'success'); mutate(); setEditPerson(null) }
    catch (e: any) { toast(e.message, 'error') }
  }

  const remove = async (id: string) => {
    if (!confirm('Are you sure you want to delete this person? This cannot be undone.')) return
    try { await api.deletePerson(id); toast('Registry entry removed', 'info'); mutate() }
    catch (e: any) { toast(e.message, 'error') }
  }

  const viewHistory = async (person: Person) => {
    const data = await api.getPerson(person.id)
    setViewPerson(data)
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <TopBar title="Biometric Registry" subtitle={`${persons.length} active profiles`} connected={false} />
      
      <main className="flex-1 p-6 max-w-6xl mx-auto space-y-6">
        
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="relative flex-1 w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={16} strokeWidth={2.5} />
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, plate number..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium border border-white bg-white/60 backdrop-blur-sm shadow-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" />
          </div>
          <button onClick={() => setAddOpen(true)} className="btn-apple h-[46px] px-6 flex items-center gap-2 whitespace-nowrap shadow-md">
            <Plus size={18} strokeWidth={2.5} />
            Add Profile
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[32px] py-32 text-center bg-white shadow-sm border border-slate-100 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
               <Users size={32} className="text-slate-200" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-bold text-slate-800">Registry Empty</p>
            <p className="text-sm text-slate-400 mt-1 max-w-[240px] mx-auto">No matching profiles found in the database.</p>
            <button onClick={() => setAddOpen(true)} className="mt-6 text-sm font-bold text-[#007AFF] hover:underline">
              Register first person
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {filtered.map(p => (
              <PersonCard key={p.id} person={p}
                onEdit={() => setEditPerson(p)}
                onDelete={() => remove(p.id)}
                onView={() => viewHistory(p)}
                onEnrollFace={() => handleEnroll(p.id)} />
            ))}
            <input id="enroll-input" type="file" accept="image/*" className="hidden" onChange={uploadFace} />
          </div>
        )}
      </main>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New Profile Registration">
        <PersonForm onSave={create} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editPerson} onClose={() => setEditPerson(null)} title="Update Profile Details">
        {editPerson && <PersonForm initial={editPerson} onSave={update} onCancel={() => setEditPerson(null)} />}
      </Modal>

      <Modal open={!!viewPerson} onClose={() => setViewPerson(null)} title={`${viewPerson?.name} Activity`} width="max-w-2xl">
        {viewPerson && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-50">
              {viewPerson.plateNumbers?.map((p: string) => <span key={p} className="plate-badge text-[11px] px-3 py-1">{p}</span>)}
            </div>
            
            <div className="space-y-3">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detection Log</p>
               {(!viewPerson.visits || viewPerson.visits.length === 0) ? (
                 <div className="py-20 text-center bg-slate-50/50 rounded-[24px] border border-dashed border-slate-200">
                    <Clock size={24} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-xs font-bold text-slate-400">No events logged yet</p>
                 </div>
               ) : (
                 <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {viewPerson.visits.map((v: any) => (
                      <div key={v.id} style={appleCard} className="flex items-center gap-4 p-3 border border-slate-50">
                        {v.thumbnailBase64 && (
                          <img src={`data:image/jpeg;base64,${v.thumbnailBase64}`} alt={v.plateText}
                            className="w-20 h-11 object-cover rounded-xl shadow-sm" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="plate-badge text-[10px]">{v.plateText}</span>
                            <span className="text-[11px] font-bold text-[#30D158]">{Math.round(v.confidence * 100)}%</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                             {new Date(v.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
