'use client'
import './globals.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/ui/Sidebar'
import { ToastProvider } from '@/components/ui/Toast'
import { useSSE } from '@/lib/useSSE'
import { Alert } from '@/types'
import { AlertTriangle, X, ShieldAlert, ExternalLink, Car } from 'lucide-react'

interface GunAlert { cameraName?: string; cameraId?: string; timestamp: string; frameIndex?: number }

// ─── Gun detection banner ─────────────────────────────────────────────────────

function GunAlertBanner({ alerts, onDismiss }: { alerts: GunAlert[]; onDismiss: () => void }) {
  if (alerts.length === 0) return null
  const latest = alerts[alerts.length - 1]
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] animate-in fade-in slide-in-from-top-4 duration-300"
      style={{ minWidth: 340 }}
    >
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-2xl shadow-2xl text-white"
        style={{ background: 'linear-gradient(135deg, #FF3B30 0%, #C0152E 100%)' }}
      >
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
        <button
          onClick={onDismiss}
          className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Watchlist hit notification card ─────────────────────────────────────────

function WatchlistCard({ alert, onDismiss }: { alert: Alert; onDismiss: (id: string) => void }) {
  return (
    <div
      className="w-[340px] rounded-2xl overflow-hidden animate-in slide-in-from-right-4 fade-in duration-400"
      style={{
        background: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
        border: '1.5px solid rgba(255,59,48,0.2)',
      }}
    >
      {/* Coloured top bar */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5"
        style={{ background: 'linear-gradient(90deg, #FF3B30 0%, #FF6961 100%)' }}
      >
        <ShieldAlert size={14} className="text-white" strokeWidth={2.5} />
        <span className="text-white text-[11px] font-black uppercase tracking-wider flex-1">
          Watchlist Hit
        </span>
        <span className="text-white/60 text-[10px] font-semibold tabular-nums">
          {new Date(alert.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Body */}
      <div className="flex gap-3 p-4">
        {alert.thumbnailBase64 ? (
          <img
            src={`data:image/jpeg;base64,${alert.thumbnailBase64}`}
            alt={alert.plateText}
            className="flex-shrink-0 rounded-xl object-cover"
            style={{ width: 72, height: 48, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          />
        ) : (
          <div
            className="flex-shrink-0 rounded-xl flex items-center justify-center"
            style={{ width: 72, height: 48, background: 'rgba(255,59,48,0.06)' }}
          >
            <Car size={20} strokeWidth={1.5} style={{ color: '#FF3B30' }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className="plate-badge text-sm">{alert.plateText}</span>
          {alert.reason && (
            <p className="text-xs mt-1.5 leading-snug line-clamp-2" style={{ color: '#6E6E73' }}>
              {alert.reason}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 pb-3 pt-0 gap-2">
        <Link
          href="/alerts"
          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={{ color: '#FF3B30', background: 'rgba(255,59,48,0.08)' }}
          onClick={() => onDismiss(alert.id)}
        >
          <ExternalLink size={11} strokeWidth={2.5} />
          View Alerts
        </Link>
        <button
          onClick={() => onDismiss(alert.id)}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={{ color: '#8E8E93', background: '#F2F2F7' }}
        >
          <X size={11} strokeWidth={2.5} />
          Dismiss
        </button>
      </div>
    </div>
  )
}

// ─── App shell ────────────────────────────────────────────────────────────────

const FRESH_WINDOW_MS = 60_000   // notify for alerts created within the last 60 seconds
const POLL_INTERVAL_MS = 5_000   // poll every 5 seconds

function AppShell({ children }: { children: React.ReactNode }) {
  const [alertCount, setAlertCount]       = useState(0)
  const [gunAlerts, setGunAlerts]         = useState<GunAlert[]>([])
  const [watchlistCards, setWatchlistCards] = useState<Alert[]>([])

  // Tracks which alert IDs have already been shown so SSE + poll don't duplicate
  const shownIdsRef = useRef<Set<string>>(new Set())

  const dismissWatchlist = useCallback((id: string) => {
    setWatchlistCards(prev => prev.filter(a => a.id !== id))
  }, [])

  const showAlert = useCallback((alert: Alert) => {
    if (shownIdsRef.current.has(alert.id)) return
    shownIdsRef.current.add(alert.id)
    setWatchlistCards(prev => {
      if (prev.some(a => a.id === alert.id)) return prev
      return [...prev, alert].slice(-4) // max 4 stacked
    })
    setTimeout(() => dismissWatchlist(alert.id), 20_000)
  }, [dismissWatchlist])

  // ── Polling fallback: catches alerts missed by SSE (session flush delay, reconnects, etc.)
  useEffect(() => {
    const poll = async () => {
      try {
        const alerts: Alert[] = await fetch('/api/alerts?acknowledged=false').then(r => r.json())
        if (!Array.isArray(alerts)) return
        setAlertCount(alerts.length)
        const cutoff = Date.now() - FRESH_WINDOW_MS
        alerts
          .filter(a => !a.acknowledged && new Date(a.timestamp).getTime() > cutoff)
          .forEach(showAlert)
      } catch { /* network error — ignore */ }
    }

    poll() // run immediately on mount
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [showAlert])

  // ── SSE: immediate delivery without waiting for the poll interval
  useSSE<Alert>('/api/alerts/stream', (alert) => {
    if (!alert.acknowledged) {
      setAlertCount(n => n + 1)
      showAlert(alert)
    }
  })

  useSSE<GunAlert>('/api/alpr/gun-alerts', (payload) => {
    setGunAlerts(prev => [...prev, payload])
    setTimeout(() => setGunAlerts(prev => prev.slice(1)), 30_000)
  })

  return (
    <div className="flex min-h-screen">
      {/* Gun alert — top-center, critical red */}
      <GunAlertBanner alerts={gunAlerts} onDismiss={() => setGunAlerts([])} />

      {/* Watchlist cards — top-right stack */}
      {watchlistCards.length > 0 && (
        <div
          className="fixed top-4 right-4 z-[998] flex flex-col gap-3 items-end"
          style={{ maxWidth: 340 }}
        >
          {watchlistCards.map(a => (
            <WatchlistCard key={a.id} alert={a} onDismiss={dismissWatchlist} />
          ))}
        </div>
      )}

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
