'use client'
import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className={`relative bg-white w-full ${width} flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300`}
        style={{
          borderRadius: 24,
          boxShadow: '0 30px 60px -12px rgba(0,0,0,0.25), 0 18px 36px -18px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid rgba(60,60,67,0.06)' }}>
          <h2 className="font-bold text-lg tracking-tight" style={{ color: '#1D1D1F' }}>{title}</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full transition-all bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  )
}
