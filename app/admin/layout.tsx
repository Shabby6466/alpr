'use client'
import '../globals.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/ui/Sidebar'
import { ToastProvider } from '@/components/ui/Toast'
import { useSSE } from '@/lib/useSSE'
import { Alert } from '@/types'
import {
  AlertTriangle, X, ShieldAlert, ExternalLink,
  Car, ChevronDown, ChevronUp, Bell, Check, User
} from 'lucide-react'

interface GunAlert { cameraName?: string; cameraId?: string; timestamp: string; frameIndex?: number }

// ─── Weapon Alert Banner ─────────────────────────────────────────────────────

function GunAlertBanner({ alerts, onDismiss }: { alerts: GunAlert[]; onDismiss: () => void }) {
  if (alerts.length === 0) return null
  const latest = alerts[alerts.length - 1]
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] animate-in fade-in slide-in-from-top-4 duration-300"
      style={{ minWidth: 360 }}
    >
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-2xl shadow-2xl text-white"
        style={{ background: 'linear-gradient(135deg, #FF3B30 0%, #C0152E 100%)' }}
      >
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black tracking-tight">
            ⚠ WEAPON DETECTED {alerts.length > 1 ? `(×${alerts.length})` : ''}
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

// ─── Watchlist Hit Popup Card ─────────────────────────────────────────────────

function WatchlistCard({ alert, onDismiss, onAcknowledge }: {
  alert: Alert
  onDismiss: (id: string) => void
  onAcknowledge: (id: string) => void
}) {
  const hasPerson = !!alert.personName
  const hasPlateImg = !!alert.thumbnailBase64
  const hasPersonFace = !!alert.personFaceThumbnail

  return (
    <div
      className="w-[360px] rounded-2xl overflow-hidden animate-in slide-in-from-right-4 fade-in duration-400"
      style={{
        background: '#fff',
        boxShadow: '0 12px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(217,58,58,0.12)',
        border: '1.5px solid rgba(217,58,58,0.22)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5"
        style={{ background: 'linear-gradient(90deg, #d93a3a 0%, #e85c5c 100%)' }}
      >
        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <ShieldAlert size={13} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-white text-[11px] font-black uppercase tracking-wider flex-1">
          🔴 Watchlist Hit Detected
        </span>
        <span className="text-white/70 text-[10px] font-semibold tabular-nums">
          {new Date(alert.timestamp).toLocaleTimeString('en-PK', { hour12: false })}
        </span>
        <button
          onClick={() => onDismiss(alert.id)}
          className="w-5 h-5 rounded-md bg-white/20 hover:bg-white/35 flex items-center justify-center transition-all ml-1"
        >
          <X size={11} className="text-white" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Plate number */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">License Plate</p>
            <span
              className="text-xl font-black tracking-widest"
              style={{ color: '#d93a3a', letterSpacing: '0.16em', fontFamily: 'monospace' }}
            >
              {alert.plateText}
            </span>
          </div>
          {/* Plate capture image */}
          {hasPlateImg ? (
            <img
              src={`data:image/jpeg;base64,${alert.thumbnailBase64}`}
              alt={alert.plateText}
              className="rounded-xl object-cover flex-shrink-0"
              style={{
                width: 96, height: 64,
                boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                border: '2px solid rgba(217,58,58,0.2)',
              }}
            />
          ) : (
            <div
              className="rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ width: 96, height: 64, background: 'rgba(217,58,58,0.06)', border: '2px solid rgba(217,58,58,0.12)' }}
            >
              <Car size={22} strokeWidth={1.5} style={{ color: '#d93a3a', opacity: 0.5 }} />
            </div>
          )}
        </div>

        {/* Person info */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{
            background: hasPerson ? 'rgba(0,122,255,0.06)' : 'rgba(142,142,147,0.06)',
            border: `1px solid ${hasPerson ? 'rgba(0,122,255,0.15)' : 'rgba(142,142,147,0.15)'}`,
          }}
        >
          {/* Person face or placeholder */}
          {hasPersonFace ? (
            <img
              src={`data:image/jpeg;base64,${alert.personFaceThumbnail}`}
              alt={alert.personName}
              className="rounded-xl object-cover flex-shrink-0"
              style={{ width: 44, height: 44, border: '2px solid rgba(0,122,255,0.2)' }}
            />
          ) : (
            <div
              className="rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                width: 44, height: 44,
                background: hasPerson ? 'rgba(0,122,255,0.1)' : 'rgba(142,142,147,0.1)',
                border: `1px solid ${hasPerson ? 'rgba(0,122,255,0.2)' : 'rgba(142,142,147,0.2)'}`,
              }}
            >
              {hasPerson
                ? <span className="text-lg font-black text-blue-500">{alert.personName!.charAt(0).toUpperCase()}</span>
                : <User size={18} strokeWidth={1.5} className="text-slate-400" />
              }
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
              {hasPerson ? 'Registered Person' : 'Person'}
            </p>
            <p className={`text-sm font-bold truncate ${hasPerson ? 'text-blue-600' : 'text-slate-400'}`}>
              {alert.personName ?? 'Unregistered / Unknown'}
            </p>
            {alert.reason && (
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{alert.reason}</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-4 pt-0">
        <button
          onClick={() => { onAcknowledge(alert.id); onDismiss(alert.id) }}
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
          style={{ color: '#28a745', background: 'rgba(40,167,69,0.08)', border: '1px solid rgba(40,167,69,0.2)' }}
        >
          <Check size={11} strokeWidth={2.5} />
          Acknowledge
        </button>
        <Link
          href="/admin/alerts"
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
          style={{ color: '#d93a3a', background: 'rgba(217,58,58,0.06)', border: '1px solid rgba(217,58,58,0.18)' }}
          onClick={() => onDismiss(alert.id)}
        >
          <ExternalLink size={11} strokeWidth={2.5} />
          View All Alerts
        </Link>
      </div>
    </div>
  )
}

// ─── Sidebar Alert Drawer ─────────────────────────────────────────────────────

function SidebarAlertDrawer({ recentAlerts, onAcknowledge }: {
  recentAlerts: Alert[]
  onAcknowledge: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const unacked = recentAlerts.filter(a => !a.acknowledged)
  if (recentAlerts.length === 0) return null

  return (
    <div
      className="mx-2 my-2 rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(217,58,58,0.2)', background: 'rgba(217,58,58,0.03)' }}
    >
      {/* Drawer header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 transition-all hover:bg-red-50/50"
      >
        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(217,58,58,0.12)' }}>
          <Bell size={11} style={{ color: '#d93a3a' }} strokeWidth={2.5} />
        </div>
        <span className="text-[11px] font-black uppercase tracking-wider flex-1 text-left" style={{ color: '#d93a3a' }}>
          Live Alerts
        </span>
        {unacked.length > 0 && (
          <span
            className="text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center"
            style={{ background: '#d93a3a', lineHeight: 1 }}
          >
            {unacked.length > 9 ? '9+' : unacked.length}
          </span>
        )}
        {expanded
          ? <ChevronUp size={12} className="text-red-400 flex-shrink-0" />
          : <ChevronDown size={12} className="text-red-400 flex-shrink-0" />
        }
      </button>

      {/* Drawer content */}
      {expanded && (
        <div className="space-y-0" style={{ borderTop: '1px solid rgba(217,58,58,0.12)' }}>
          {recentAlerts.slice(0, 5).map((alert, i) => {
            const isAcked = alert.acknowledged
            const hasPerson = !!alert.personName
            const hasPlateImg = !!alert.thumbnailBase64
            const hasPersonFace = !!alert.personFaceThumbnail

            return (
              <div
                key={alert.id}
                className="px-2.5 py-2.5 transition-all hover:bg-red-50/40"
                style={{
                  borderBottom: i < recentAlerts.slice(0, 5).length - 1 ? '1px solid rgba(217,58,58,0.08)' : 'none',
                  opacity: isAcked ? 0.55 : 1,
                }}
              >
                {/* Row: plate image + info */}
                <div className="flex items-start gap-2">
                  {/* Plate thumbnail */}
                  {hasPlateImg ? (
                    <img
                      src={`data:image/jpeg;base64,${alert.thumbnailBase64}`}
                      alt={alert.plateText}
                      className="rounded-lg object-cover flex-shrink-0"
                      style={{ width: 52, height: 36, border: '1.5px solid rgba(217,58,58,0.25)' }}
                    />
                  ) : (
                    <div
                      className="rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ width: 52, height: 36, background: 'rgba(217,58,58,0.08)', border: '1.5px solid rgba(217,58,58,0.18)' }}
                    >
                      <Car size={14} style={{ color: '#d93a3a', opacity: 0.6 }} strokeWidth={1.5} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Plate number */}
                    <p className="text-[11px] font-black tracking-widest leading-none" style={{ color: '#d93a3a', fontFamily: 'monospace' }}>
                      {alert.plateText}
                    </p>
                    {/* Person identity row */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {hasPersonFace ? (
                        <img
                          src={`data:image/jpeg;base64,${alert.personFaceThumbnail}`}
                          alt={alert.personName}
                          className="rounded-md object-cover flex-shrink-0"
                          style={{ width: 16, height: 16, border: '1px solid rgba(0,122,255,0.3)' }}
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ background: hasPerson ? 'rgba(0,122,255,0.1)' : 'rgba(142,142,147,0.1)' }}>
                          <User size={9} style={{ color: hasPerson ? '#007AFF' : '#8E8E93' }} strokeWidth={2} />
                        </div>
                      )}
                      <p className={`text-[10px] font-bold truncate ${hasPerson ? 'text-blue-500' : 'text-slate-400'}`}>
                        {alert.personName ?? 'Unknown'}
                      </p>
                    </div>
                    {/* Time */}
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">
                      {new Date(alert.timestamp).toLocaleTimeString('en-PK', { hour12: false })}
                    </p>
                  </div>

                  {/* Acknowledge button */}
                  {!isAcked && (
                    <button
                      onClick={() => onAcknowledge(alert.id)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:bg-green-100"
                      style={{ border: '1px solid rgba(40,167,69,0.3)' }}
                      title="Acknowledge"
                    >
                      <Check size={11} style={{ color: '#28a745' }} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* View all link */}
          <Link
            href="/admin/alerts"
            className="flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold transition-all hover:bg-red-50"
            style={{ color: '#d93a3a', borderTop: '1px solid rgba(217,58,58,0.1)' }}
          >
            <ExternalLink size={10} strokeWidth={2.5} />
            View All Alerts
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Main shell ───────────────────────────────────────────────────────────────

const FRESH_WINDOW_MS = 60_000
const POLL_INTERVAL_MS = 5_000

function AppShell({ children }: { children: React.ReactNode }) {
  const [alertCount, setAlertCount]         = useState(0)
  const [gunAlerts, setGunAlerts]           = useState<GunAlert[]>([])
  const [watchlistCards, setWatchlistCards] = useState<Alert[]>([])   // popup cards
  const [sidebarAlerts, setSidebarAlerts]   = useState<Alert[]>([])   // sidebar drawer
  const shownIdsRef = useRef<Set<string>>(new Set())

  const acknowledgeAlert = useCallback(async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}/acknowledge`, { method: 'PATCH' })
      setSidebarAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
    } catch { /* ignore */ }
  }, [])

  const dismissCard = useCallback((id: string) => {
    setWatchlistCards(prev => prev.filter(a => a.id !== id))
  }, [])

  const showAlert = useCallback((alert: Alert) => {
    if (shownIdsRef.current.has(alert.id)) return
    shownIdsRef.current.add(alert.id)

    // Add to sidebar drawer (persistent)
    setSidebarAlerts(prev => {
      if (prev.some(a => a.id === alert.id)) return prev
      return [alert, ...prev].slice(0, 20)
    })

    // Show brief popup card (auto-dismisses after 15s)
    setWatchlistCards(prev => {
      if (prev.some(a => a.id === alert.id)) return prev
      return [...prev, alert].slice(-3) // max 3 stacked
    })
    setTimeout(() => dismissCard(alert.id), 15_000)
  }, [dismissCard])

  // Initial poll + periodic refresh
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/alerts?acknowledged=false')
        const alerts: Alert[] = await res.json()
        if (!Array.isArray(alerts)) return
        setAlertCount(alerts.length)
        const cutoff = Date.now() - FRESH_WINDOW_MS
        alerts
          .filter(a => !a.acknowledged && new Date(a.timestamp).getTime() > cutoff)
          .forEach(showAlert)
        // Also keep sidebar populated with recent alerts (including acknowledged)
        setSidebarAlerts(prev => {
          const ids = new Set(prev.map(a => a.id))
          const newOnes = alerts.filter(a => !ids.has(a.id))
          return [...newOnes, ...prev].slice(0, 20)
        })
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [showAlert])

  // SSE real-time
  useSSE<Alert>('/api/alerts/stream', (alert) => {
    if (!alert.acknowledged) { setAlertCount(n => n + 1); showAlert(alert) }
  })

  useSSE<GunAlert>('/api/alpr/gun-alerts', (payload) => {
    setGunAlerts(prev => [...prev, payload])
    setTimeout(() => setGunAlerts(prev => prev.slice(1)), 30_000)
  })

  return (
    <div className="flex min-h-screen">
      <GunAlertBanner alerts={gunAlerts} onDismiss={() => setGunAlerts([])} />

      {/* Popup cards — stacked bottom-right, non-spammy (max 3) */}
      {watchlistCards.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[998] flex flex-col gap-3 items-end" style={{ maxWidth: 380 }}>
          {watchlistCards.map(a => (
            <WatchlistCard
              key={a.id}
              alert={a}
              onDismiss={dismissCard}
              onAcknowledge={acknowledgeAlert}
            />
          ))}
        </div>
      )}

      <Sidebar alertCount={alertCount} sidebarAlerts={sidebarAlerts} onAcknowledge={acknowledgeAlert} />
      <div className="flex-1 ml-[240px] flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  )
}
