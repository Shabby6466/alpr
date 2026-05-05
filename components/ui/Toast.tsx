'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

type Kind = 'success' | 'error' | 'warning' | 'info'
interface Toast { id: number; message: string; kind: Kind }

const ToastCtx = createContext<{ toast: (msg: string, kind?: Kind) => void }>({ toast: () => {} })
export const useToast = () => useContext(ToastCtx)

const config: Record<Kind, { icon: any; color: string; bg: string }> = {
  success: { icon: CheckCircle,  color: '#30D158', bg: 'rgba(48,209,88,0.1)' },
  error:   { icon: XCircle,      color: '#FF3B30', bg: 'rgba(255,59,48,0.1)' },
  warning: { icon: AlertTriangle, color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
  info:    { icon: Info,         color: '#007AFF', bg: 'rgba(0,122,255,0.1)' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, kind: Kind = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000)
  }, [])

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 space-y-3 z-[100] flex flex-col items-center pointer-events-none">
        {toasts.map(t => {
          const c = config[t.kind]
          const Icon = c.icon
          return (
            <div key={t.id}
              className="pointer-events-auto flex items-center gap-3 rounded-[100px] px-5 py-3 min-w-[280px] max-w-md animate-in slide-in-from-top-4 fade-in duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: c.bg }}>
                <Icon size={14} style={{ color: c.color }} strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold flex-1 tracking-tight" style={{ color: '#1D1D1F' }}>{t.message}</span>
              <button
                onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}
                style={{ color: '#AEAEB2' }}
                className="hover:text-slate-600 transition-colors ml-1"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
