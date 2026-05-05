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
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full ${width} flex flex-col max-h-[90vh] rounded-xl overflow-hidden`}
        style={{
          background: '#0c1528',
          border: '1px solid #1a2744',
          boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(37,99,235,0.1)',
        }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #1a2744' }}>
          <h2 className="font-semibold text-slate-100 text-base">{title}</h2>
          <button onClick={onClose}
            className="text-slate-600 hover:text-slate-300 rounded-lg p-1.5 hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
