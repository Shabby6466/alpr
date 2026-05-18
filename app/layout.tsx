'use client'
import './globals.css'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/ui/Sidebar'
import { ToastProvider } from '@/components/ui/Toast'
import { useSSE } from '@/lib/useSSE'
import { Alert } from '@/types'
import { AlertTriangle, X } from 'lucide-react'

interface GunAlert { cameraName?: string; cameraId?: string; timestamp: string; frameIndex?: number }

function GunAlertBanner({ alerts, onDismiss }: { alerts: GunAlert[]; onDismiss: () => void }) {
  if (alerts.length === 0) return null
  const latest = alerts[alerts.length - 1]
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] animate-in fade-in slide-in-from-top-4 duration-300"
      style={{ minWidth: 340 }}>
      <div className="flex items-center gap-4 px-5 py-4 rounded-2xl shadow-2xl text-white"
        style={{ background: 'linear-gradient(135deg, #FF3B30 0%, #C0152E 100%)' }}>
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black tracking-tight">
            WEAPON DETECTED {alerts.length > 1 ? `(×${alerts.length})` : ''}
          </p>
          <p className="text-[11px] font-bold text-white/70 mt-0.5">
            {latest.cameraName ? `Camera: ${latest.cameraName}` : 'Manual detection'} ·{' '}
            {new Date(latest.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <button onClick={onDismiss}
          className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [alertCount, setAlertCount] = useState(0)
  const [gunAlerts, setGunAlerts] = useState<GunAlert[]>([])

  useEffect(() => {
    fetch('/api/alerts?acknowledged=false')
      .then(r => r.json())
      .then((a: Alert[]) => setAlertCount(a.length))
      .catch(() => {})
  }, [])

  useSSE<Alert>('/api/alerts/stream', (alert) => {
    if (!alert.acknowledged) setAlertCount(n => n + 1)
  })

  useSSE<GunAlert>('/api/alpr/gun-alerts', (payload) => {
    setGunAlerts(prev => [...prev, payload])
    // Auto-dismiss after 30 seconds if not manually dismissed
    setTimeout(() => setGunAlerts(prev => prev.slice(1)), 30_000)
  })

  return (
    <div className="flex min-h-screen">
      <GunAlertBanner alerts={gunAlerts} onDismiss={() => setGunAlerts([])} />
      <Sidebar alertCount={alertCount} />
      <div className="flex-1 ml-[240px] flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>ALPR System</title>
        <meta name="description" content="Automatic License Plate Recognition" />
      </head>
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  )
}
