'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

type Kind = 'success' | 'error' | 'warning' | 'info'
interface Toast { id: number; message: string; kind: Kind }

const ToastCtx = createContext<{ toast: (msg: string, kind?: Kind) => void }>({ toast: () => {} })
export const useToast = () => useContext(ToastCtx)

const icons = {
  success: <CheckCircle size={16} className="text-green-500" />,
  error:   <XCircle    size={16} className="text-red-500" />,
  warning: <AlertTriangle size={16} className="text-amber-500" />,
  info:    <Info       size={16} className="text-blue-500" />,
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
      <div className="fixed bottom-4 right-4 space-y-2 z-[100]">
        {toasts.map(t => (
          <div key={t.id}
            className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 min-w-[280px] max-w-sm">
            {icons[t.kind]}
            <span className="text-sm text-slate-700 flex-1">{t.message}</span>
            <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}
              className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
