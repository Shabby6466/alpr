'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

type Kind = 'success' | 'error' | 'warning' | 'info'
interface Toast { id: number; message: string; kind: Kind }

const ToastCtx = createContext<{ toast: (msg: string, kind?: Kind) => void }>({ toast: () => {} })
export const useToast = () => useContext(ToastCtx)

const config = {
  success: { icon: <CheckCircle size={15} className="text-green-400" />, border: 'rgba(34,197,94,0.3)', glow: 'rgba(34,197,94,0.1)' },
  error:   { icon: <XCircle    size={15} className="text-red-400"   />, border: 'rgba(239,68,68,0.3)',  glow: 'rgba(239,68,68,0.1)' },
  warning: { icon: <AlertTriangle size={15} className="text-amber-400" />, border: 'rgba(245,158,11,0.3)', glow: 'rgba(245,158,11,0.1)' },
  info:    { icon: <Info       size={15} className="text-blue-400"  />, border: 'rgba(59,130,246,0.3)', glow: 'rgba(59,130,246,0.1)' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  let counter = 0

  const toast = useCallback((message: string, kind: Kind = 'info') => {
    const id = ++counter
    setToasts(t => [...t, { id, message, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 space-y-2 z-[100]">
        {toasts.map(t => {
          const c = config[t.kind]
          return (
            <div key={t.id}
              className="flex items-center gap-3 rounded-xl px-4 py-3 min-w-[300px] max-w-sm"
              style={{
                background: '#0c1528',
                border: `1px solid ${c.border}`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${c.glow}`,
              }}>
              {c.icon}
              <span className="text-sm text-slate-200 flex-1">{t.message}</span>
              <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}
                className="text-slate-600 hover:text-slate-300">
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
