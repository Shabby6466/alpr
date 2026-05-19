'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Camera, List, Users, ShieldAlert, Bell, BarChart3, Video, Route, MonitorPlay } from 'lucide-react'

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

export default function Sidebar({ alertCount }: { alertCount: number }) {
  const path = usePathname()
  return (
    <aside
      className="fixed top-0 left-0 h-screen w-[240px] flex flex-col z-50"
      style={{
        background: 'rgba(246,246,246,0.88)',
        borderRight: '1px solid rgba(60,60,67,0.1)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      {/* Brand */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <Image src="/Logo.png" alt="MITS" width={36} height={36} className="flex-shrink-0" style={{ objectFit: 'contain' }} />
          <div>
            <Image src="/M.I.T.S.png" alt="M.I.T.S." width={72} height={16} style={{ objectFit: 'contain', filter: 'invert(1)' }} />
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#8E8E93' }}>Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4" style={{ height: 1, background: 'rgba(60,60,67,0.1)' }} />

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
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
                  style={{ background: '#FF3B30', lineHeight: 1 }}>
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4" style={{ height: 1, background: 'rgba(60,60,67,0.1)' }} />

      {/* Ops Dashboard link */}
      <div className="px-2 py-2">
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
      <div className="mx-4" style={{ height: 1, background: 'rgba(60,60,67,0.1)' }} />

      {/* Footer */}
      <div className="px-5 py-4">
        <p className="text-xs" style={{ color: '#C7C7CC' }}>MITS v1.0 · Active</p>
      </div>
    </aside>
  )
}
