'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { Person } from '@/types'
import { Plus, Pencil, Trash2, Users, Clock, Car, User, Camera, Search } from 'lucide-react'

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

  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' as const }

  return (
    <div className="space-y-4">
      <div>
        <label style={labelStyle}>Full Name *</label>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="John Doe" />
      </div>
      <div>
        <label style={labelStyle}>License Plates * <span style={{ color: '#334155', fontWeight: 400, textTransform: 'none' }}>(one per line)</span></label>
        <textarea value={plates} onChange={e => setPlates(e.target.value)} rows={3}
          style={{ ...inputStyle, fontFamily: 'Courier New, monospace', resize: 'vertical' }}
          placeholder={'MH20EE7602\nDL1CAB0001'} />
      </div>
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          style={{ ...inputStyle, resize: 'vertical' }} placeholder="Optional notes…" />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={submit}
          className="flex-1 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
          style={{ background: '#2563eb' }}>
          {initial?.id ? 'Update Person' : 'Register Person'}
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

function PersonCard({ person, onEdit, onDelete, onView, onEnrollFace }: {
  person: Person; onEdit: () => void; onDelete: () => void; onView: () => void; onEnrollFace: () => void
}) {
  return (
    <div className="rounded-xl p-5 transition-all group"
      style={{ background: '#0c1528', border: '1px solid #1a2744' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#1e3a5f')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a2744')}>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center relative cursor-pointer"
          style={{ background: '#070e1c', border: '1px solid #1a2744' }}
          onClick={onEnrollFace}>
          {(person as any).faceThumbnail ? (
            <img src={`data:image/jpeg;base64,${(person as any).faceThumbnail}`} alt={person.name}
              className="w-full h-full object-cover" />
          ) : (
            <User size={22} style={{ color: '#1e3358' }} />
          )}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            style={{ background: 'rgba(37,99,235,0.7)' }}>
            <Camera size={16} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-100 truncate">{person.name}</h3>
            <div className="flex gap-0.5 flex-shrink-0">
              <button onClick={onEdit}
                className="p-1.5 rounded-lg transition-colors text-slate-600 hover:text-blue-400 hover:bg-blue-950/40">
                <Pencil size={13} />
              </button>
              <button onClick={onDelete}
                className="p-1.5 rounded-lg transition-colors text-slate-600 hover:text-red-400 hover:bg-red-950/30">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          {person.notes && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{person.notes}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {person.plateNumbers.map(p => <span key={p} className="plate-badge text-xs">{p}</span>)}
      </div>

      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #0f1e38' }}>
        <p className="text-xs flex items-center gap-1" style={{ color: '#1e3358' }}>
          <Clock size={10} />
          {new Date(person.createdAt).toLocaleDateString()}
        </p>
        <button onClick={onView}
          className="text-xs font-semibold flex items-center gap-1.5 transition-colors text-slate-600 hover:text-blue-400">
          <Car size={12} />View history
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
      toast('Face enrolled successfully', 'success')
      mutate()
    } catch (e: any) { toast(e.message, 'error') }
    finally { setEnrollId(null); e.target.value = '' }
  }

  const filtered = persons.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.plateNumbers.some(pl => pl.toLowerCase().includes(search.toLowerCase()))
  )

  const create = async (data: any) => {
    try { await api.createPerson(data); toast('Person registered', 'success'); mutate(); setAddOpen(false) }
    catch (e: any) { toast(e.message, 'error') }
  }

  const update = async (data: any) => {
    if (!editPerson) return
    try { await api.updatePerson(editPerson.id, data); toast('Person updated', 'success'); mutate(); setEditPerson(null) }
    catch (e: any) { toast(e.message, 'error') }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this person?')) return
    try { await api.deletePerson(id); toast('Deleted', 'info'); mutate() }
    catch (e: any) { toast(e.message, 'error') }
  }

  const viewHistory = async (person: Person) => {
    const data = await api.getPerson(person.id)
    setViewPerson(data)
  }

  return (
    <>
      <TopBar title="Persons" subtitle={`${persons.length} registered`} connected={false} />
      <main className="flex-1 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2.5"
            style={{ background: '#0c1528', border: '1px solid #1a2744' }}>
            <Search size={14} className="text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or plate…"
              className="text-sm outline-none flex-1 bg-transparent text-slate-200 placeholder-slate-700" />
          </div>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: '#2563eb' }}>
            <Plus size={16} />Register Person
          </button>
        </div>

        {filtered.length === 0
          ? <div className="rounded-xl py-24 text-center"
              style={{ background: '#0c1528', border: '1px solid #1a2744' }}>
              <Users size={40} className="mx-auto mb-4" style={{ color: '#1a2744' }} />
              <p className="text-slate-600 font-medium">No persons registered</p>
              <button onClick={() => setAddOpen(true)}
                className="mt-3 text-sm font-semibold transition-colors text-blue-500 hover:text-blue-400">
                Register the first person →
              </button>
            </div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(p => (
                <PersonCard key={p.id} person={p}
                  onEdit={() => setEditPerson(p)}
                  onDelete={() => remove(p.id)}
                  onView={() => viewHistory(p)}
                  onEnrollFace={() => handleEnroll(p.id)} />
              ))}
              <input id="enroll-input" type="file" accept="image/*" className="hidden" onChange={uploadFace} />
            </div>}
      </main>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Register Person">
        <PersonForm onSave={create} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editPerson} onClose={() => setEditPerson(null)} title="Edit Person">
        {editPerson && <PersonForm initial={editPerson} onSave={update} onCancel={() => setEditPerson(null)} />}
      </Modal>

      <Modal open={!!viewPerson} onClose={() => setViewPerson(null)} title={`${viewPerson?.name} — Visit History`} width="max-w-2xl">
        {viewPerson && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {viewPerson.plateNumbers?.map((p: string) => <span key={p} className="plate-badge">{p}</span>)}
            </div>
            {(!viewPerson.visits || viewPerson.visits.length === 0)
              ? <p className="text-slate-600 text-sm text-center py-10">No visits recorded yet</p>
              : <div className="space-y-2 max-h-80 overflow-y-auto">
                  {viewPerson.visits.map((v: any) => (
                    <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ background: '#080f1e', border: '1px solid #1a2744' }}>
                      {v.thumbnailBase64 && (
                        <img src={`data:image/jpeg;base64,${v.thumbnailBase64}`} alt={v.plateText}
                          className="w-14 h-8 object-cover rounded"
                          style={{ border: '1px solid #1a2744' }} />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="plate-badge text-xs">{v.plateText}</span>
                          <span className="text-xs font-bold" style={{ color: '#64748b' }}>{Math.round(v.confidence * 100)}%</span>
                        </div>
                      </div>
                      <p className="text-xs font-mono" style={{ color: '#334155' }}>{new Date(v.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>}
          </div>
        )}
      </Modal>
    </>
  )
}
