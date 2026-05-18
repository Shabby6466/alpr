'use client'
import { useState, useRef, useEffect } from 'react'
import { Search, Camera, User, Car, X, Loader2, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import Link from 'next/link'

export default function GlobalSearch() {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ persons: any[], events: any[] }>({ persons: [], events: [] })
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [searchingFace, setSearchingFace] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const faceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setResults({ persons: [], events: [] })
        return
      }
      setLoading(true)
      try {
        const [pRes, eRes] = await Promise.all([
          api.getPersons(),
          api.getEvents({ plate: query, limit: '5' })
        ])
        const filteredPersons = (pRes as any[]).filter(p => 
          p.name.toLowerCase().includes(query.toLowerCase()) || 
          p.plateNumbers.some((pl: string) => pl.toLowerCase().includes(query.toLowerCase()))
        ).slice(0, 3)
        
        setResults({ persons: filteredPersons, events: eRes.data })
        setOpen(true)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleFaceSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSearchingFace(true)
    setOpen(false)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const templates = await api.detect(fd, { thumbnail: 'true' })
      if (templates.count === 0 || !templates.faces?.[0]?.personId) {
        toast('No matching identified person found in image', 'warning')
        return
      }
      const personId = templates.faces[0].personId
      window.location.href = `/persons?search=${personId}`
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setSearchingFace(false)
      if (faceInputRef.current) faceInputRef.current.value = ''
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative group">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#007AFF] transition-colors">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} strokeWidth={2.5} />}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search plates, names, IDs..."
          className="w-full bg-[#F2F2F7] border border-transparent focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 rounded-2xl pl-10 pr-12 py-2 text-sm font-medium transition-all outline-none placeholder:text-slate-400"
        />
        <button 
          onClick={() => faceInputRef.current?.click()}
          disabled={searchingFace}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#007AFF] hover:bg-white hover:shadow-sm transition-all"
        >
          {searchingFace ? <Loader2 size={14} className="animate-spin text-[#007AFF]" /> : <Camera size={16} strokeWidth={2.5} />}
        </button>
        <input type="file" ref={faceInputRef} onChange={handleFaceSearch} accept="image/*" className="hidden" />
      </div>

      {open && (results.persons.length > 0 || results.events.length > 0) && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {results.persons.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identified Profiles</p>
              {results.persons.map(p => (
                <Link key={p.id} href={`/persons`} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#007AFF]">
                    <User size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{p.plateNumbers[0]}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-all" />
                </Link>
              ))}
            </div>
          )}

          {results.events.length > 0 && (
            <div className="p-2 border-t border-slate-50">
              <p className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Detections</p>
              {results.events.map(e => (
                <Link key={e.id} href={`/events`} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors group">
                  <div className="w-8 h-5 rounded bg-slate-100 flex items-center justify-center">
                    <Car size={12} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 tracking-tight">{e.plateText}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(e.timestamp).toLocaleDateString()}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-all" />
                </Link>
              ))}
            </div>
          )}
          
          <div className="p-2 bg-slate-50 border-t border-slate-100">
             <Link href="/events" onClick={() => setOpen(false)} className="block text-center text-[11px] font-bold text-blue-500 hover:underline">
               View all historical records
             </Link>
          </div>
        </div>
      )}
    </div>
  )
}
