'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { Person } from '@/types'
import { Plus, Pencil, Trash2, Users, Clock, Car, User, Camera } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function PersonForm({ initial, onSave, onCancel }: {
  initial?: Partial<Person>
  onSave: (data: any) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [plates, setPlates] = useState((initial?.plateNumbers ?? ['']).join('\n'))
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const submit = () => {
    const plateNumbers = plates.split('\n').map(p => p.trim()).filter(Boolean)
    if (!name.trim() || plateNumbers.length === 0) return
    onSave({ name: name.trim(), plateNumbers, notes: notes.trim() || undefined })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="John Doe" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">License Plates * <span className="text-slate-400 font-normal">(one per line)</span></label>
        <textarea value={plates} onChange={e => setPlates(e.target.value)} rows={3}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
          placeholder={"MH20EE7602\nDL1CAB0001"} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Optional notes…" />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={submit}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors">
          {initial?.id ? 'Update Person' : 'Add Person'}
        </button>
        <button onClick={onCancel}
          className="px-4 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
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
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
      <div className="flex items-start gap-4 mb-3">
        <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 border border-slate-200 overflow-hidden flex items-center justify-center relative group cursor-pointer" onClick={onEnrollFace}>
          {(person as any).faceThumbnail ? (
            <img src={`data:image/jpeg;base64,${(person as any).faceThumbnail}`} alt={person.name} className="w-full h-full object-cover" />
          ) : (
            <User className="text-slate-300" size={24} />
          )}
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera className="text-white" size={16} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-slate-800 truncate">{person.name}</h3>
            <div className="flex gap-1">
              <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-500 rounded hover:bg-blue-50 transition-colors">
                <Pencil size={14} />
              </button>
              <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          {person.notes && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{person.notes}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {person.plateNumbers.map(p => <span key={p} className="plate-badge text-xs">{p}</span>)}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <Clock size={11} />
          Added {new Date(person.createdAt).toLocaleDateString()}
        </p>
        <button onClick={onView}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
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
  const fileInputRef = useState<any>(null)
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
    try {
      await api.createPerson(data)
      toast('Person registered', 'success')
      mutate(); setAddOpen(false)
    } catch (e: any) { toast(e.message, 'error') }
  }

  const update = async (data: any) => {
    if (!editPerson) return
    try {
      await api.updatePerson(editPerson.id, data)
      toast('Person updated', 'success')
      mutate(); setEditPerson(null)
    } catch (e: any) { toast(e.message, 'error') }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this person?')) return
    try {
      await api.deletePerson(id); toast('Deleted', 'info'); mutate()
    } catch (e: any) { toast(e.message, 'error') }
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
          <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Users size={15} className="text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or plate…"
              className="text-sm outline-none flex-1 placeholder:text-slate-400" />
          </div>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} />Add Person
          </button>
        </div>

        {filtered.length === 0
          ? <div className="bg-white border border-slate-200 rounded-xl py-20 text-center">
              <Users size={36} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 font-medium">No persons registered yet</p>
              <button onClick={() => setAddOpen(true)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">Add the first person →</button>
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
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {viewPerson.plateNumbers?.map((p: string) => <span key={p} className="plate-badge">{p}</span>)}
            </div>
            {(!viewPerson.visits || viewPerson.visits.length === 0)
              ? <p className="text-slate-400 text-sm text-center py-8">No visits recorded yet</p>
              : <div className="space-y-2 max-h-80 overflow-y-auto">
                  {viewPerson.visits.map((v: any) => (
                    <div key={v.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      {v.thumbnailBase64 && (
                        <img src={`data:image/jpeg;base64,${v.thumbnailBase64}`} alt={v.plateText}
                          className="w-14 h-8 object-cover rounded border border-slate-200" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="plate-badge text-xs">{v.plateText}</span>
                          <span className="text-xs text-slate-400">{Math.round(v.confidence * 100)}%</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">{new Date(v.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>}
          </div>
        )}
      </Modal>
    </>
  )
}
