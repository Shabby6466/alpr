'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useState } from 'react'
import {
  Camera, List, Users, ShieldAlert, Bell, BarChart3,
  Video, Route, MonitorPlay, ChevronDown, ChevronUp,
  ExternalLink, Check, Car, User, X
} from 'lucide-react'
import { Alert } from '@/types'

const nav = [
  { href: '/admin/detect',    icon: Camera,        label: 'Detection' },
  { href: '/admin/cameras',   icon: Video,         label: 'Cameras' },
  { href: '/admin/events',    icon: List,          label: 'Events' },
  { href: '/admin/journeys',  icon: Route,         label: 'Journeys' },
  { href: '/admin/persons',   icon: Users,         label: 'Persons' },
  { href: '/admin/watchlist', icon: ShieldAlert,   label: 'Watchlist' },
  { href: '/admin/alerts',    icon: Bell,          label: 'Alerts' },
  { href: '/admin/reports',   icon: BarChart3,     label: 'Reports' },
]

export default function Sidebar({
  alertCount,
  sidebarAlerts = [],
  onAcknowledge,
}: {
  alertCount: number
  sidebarAlerts?: Alert[]
  onAcknowledge?: (id: string) => void
}) {
  const path = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visibleAlerts = sidebarAlerts.filter(a => !dismissed.has(a.id))
  const unacked = visibleAlerts.filter(a => !a.acknowledged)

  function handleAcknowledge(id: string) {
    onAcknowledge?.(id)
  }

  function handleDismiss(id: string) {
    setDismissed(prev => new Set([...prev, id]))
  }

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-[240px] flex flex-col z-50"
      style={{
        background: 'rgba(246,246,246,0.96)',
        borderRight: '1px solid rgba(60,60,67,0.1)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Image src="/Logo.png" alt="MITS" width={36} height={36} className="flex-shrink-0" style={{ objectFit: 'contain' }} />
          <div>
            <Image src="/M.I.T.S.png" alt="M.I.T.S." width={72} height={16} style={{ objectFit: 'contain', filter: 'invert(1)' }} />
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#8E8E93' }}>Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 flex-shrink-0" style={{ height: 1, background: 'rgba(60,60,67,0.1)' }} />

      {/* Nav */}
      <nav className="flex-shrink-0 px-2 py-3 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative"
              style={{
                color: active ? '#007AFF' : '#3A3A3C',
                background: active ? 'rgba(0,122,255,0.1)' : 'transparent',
                fontWeight: active ? 600 : 500,
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(60,60,67,0.06)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <Icon size={17} strokeWidth={active ? 2.2 : 1.8}
                style={{ color: active ? '#007AFF' : '#6E6E73' }} />
              {label}
              {label === 'Alerts' && alertCount > 0 && (
                <span className="ml-auto text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center"
                  style={{ background: '#d93a3a', lineHeight: 1 }}>
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 flex-shrink-0" style={{ height: 1, background: 'rgba(60,60,67,0.1)' }} />

      {/* ── LIVE ALERT DRAWER ─────────────────────────── */}
      {visibleAlerts.length > 0 && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Drawer toggle header */}
          <button
            onClick={() => setDrawerOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-2.5 transition-all flex-shrink-0"
            style={{ borderBottom: drawerOpen ? '1px solid rgba(217,58,58,0.15)' : 'none' }}
          >
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(217,58,58,0.1)' }}>
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
            {drawerOpen
              ? <ChevronUp size={12} className="flex-shrink-0" style={{ color: '#d93a3a' }} />
              : <ChevronDown size={12} className="flex-shrink-0" style={{ color: '#d93a3a' }} />
            }
          </button>

          {/* Scrollable alert list */}
          {drawerOpen && (
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {visibleAlerts.slice(0, 10).map((alert, i) => {
                const isAcked = alert.acknowledged
                const hasPerson = !!alert.personName
                const hasPlateImg = !!alert.thumbnailBase64
                const hasPersonFace = !!alert.personFaceThumbnail

                return (
                  <div
                    key={alert.id}
                    className="px-3 py-2.5 transition-all"
                    style={{
                      borderBottom: '1px solid rgba(217,58,58,0.08)',
                      background: isAcked ? 'transparent' : 'rgba(217,58,58,0.025)',
                      opacity: isAcked ? 0.6 : 1,
                    }}
                  >
                    {/* Plate + image row */}
                    <div className="flex items-start gap-2 mb-1.5">
                      {/* Plate capture thumbnail */}
                      {hasPlateImg ? (
                        <img
                          src={`data:image/jpeg;base64,${alert.thumbnailBase64}`}
                          alt={alert.plateText}
                          className="rounded-lg object-cover flex-shrink-0"
                          style={{
                            width: 56, height: 38,
                            border: '1.5px solid rgba(217,58,58,0.3)',
                          }}
                        />
                      ) : (
                        <div
                          className="rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ width: 56, height: 38, background: 'rgba(217,58,58,0.07)', border: '1.5px solid rgba(217,58,58,0.18)' }}
                        >
                          <Car size={16} style={{ color: '#d93a3a', opacity: 0.5 }} strokeWidth={1.5} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Plate number */}
                        <p
                          className="text-[12px] font-black tracking-widest leading-tight"
                          style={{ color: '#d93a3a', fontFamily: 'monospace' }}
                        >
                          {alert.plateText}
                        </p>
                        {/* Time */}
                        <p className="text-[9px] font-medium mt-0.5" style={{ color: '#8E8E93' }}>
                          {new Date(alert.timestamp).toLocaleTimeString('en-PK', { hour12: false })}
                          {isAcked && <span className="ml-1.5 text-green-500 font-bold">✓ ACKED</span>}
                        </p>
                      </div>

                      {/* Dismiss */}
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 hover:bg-red-100 transition-all"
                      >
                        <X size={10} style={{ color: '#8E8E93' }} />
                      </button>
                    </div>

                    {/* Person identity row */}
                    <div
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                      style={{
                        background: hasPerson ? 'rgba(0,122,255,0.06)' : 'rgba(142,142,147,0.06)',
                        border: `1px solid ${hasPerson ? 'rgba(0,122,255,0.15)' : 'rgba(142,142,147,0.12)'}`,
                      }}
                    >
                      {/* Face photo or initial */}
                      {hasPersonFace ? (
                        <img
                          src={`data:image/jpeg;base64,${alert.personFaceThumbnail}`}
                          alt={alert.personName}
                          className="rounded-md object-cover flex-shrink-0"
                          style={{ width: 24, height: 24, border: '1px solid rgba(0,122,255,0.25)' }}
                        />
                      ) : (
                        <div
                          className="rounded-md flex items-center justify-center flex-shrink-0"
                          style={{
                            width: 24, height: 24,
                            background: hasPerson ? 'rgba(0,122,255,0.12)' : 'rgba(142,142,147,0.1)',
                          }}
                        >
                          {hasPerson
                            ? <span className="text-[11px] font-black text-blue-500">{alert.personName!.charAt(0).toUpperCase()}</span>
                            : <User size={11} style={{ color: '#8E8E93' }} strokeWidth={2} />
                          }
                        </div>
                      )}
                      <span className={`text-[10px] font-bold truncate flex-1 ${hasPerson ? 'text-blue-600' : 'text-slate-400'}`}>
                        {alert.personName ?? 'Unknown Person'}
                      </span>
                      {/* Acknowledge button */}
                      {!isAcked && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 hover:bg-green-100 transition-all"
                          style={{ border: '1px solid rgba(40,167,69,0.3)' }}
                          title="Acknowledge"
                        >
                          <Check size={10} style={{ color: '#28a745' }} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* View all */}
              <Link
                href="/admin/alerts"
                className="flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold transition-all hover:bg-red-50"
                style={{ color: '#d93a3a', borderTop: '1px solid rgba(217,58,58,0.1)' }}
              >
                <ExternalLink size={10} strokeWidth={2.5} />
                View All Alerts
              </Link>
            </div>
          )}
        </div>
      )}

      {/* If no alerts: fill remaining space */}
      {visibleAlerts.length === 0 && <div className="flex-1" />}

      {/* Divider */}
      <div className="mx-4 flex-shrink-0" style={{ height: 1, background: 'rgba(60,60,67,0.1)' }} />

      {/* Ops Dashboard link */}
      <div className="px-2 py-2 flex-shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 group"
          style={{ color: '#007AFF' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,122,255,0.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <MonitorPlay size={17} strokeWidth={2} style={{ color: '#007AFF' }} />
          Ops Dashboard
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-4 flex-shrink-0" style={{ height: 1, background: 'rgba(60,60,67,0.1)' }} />

      {/* Footer */}
      <div className="px-5 py-4 flex-shrink-0">
        <p className="text-xs" style={{ color: '#C7C7CC' }}>MITS v1.0 · Active</p>
      </div>
    </aside>
  )
}
