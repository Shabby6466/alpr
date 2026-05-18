'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Camera, List, Users, ShieldAlert, Bell, ScanLine, BarChart3, Video } from 'lucide-react'

const nav = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/detect', icon: Camera, label: 'Detection' },
  { href: '/cameras', icon: Video, label: 'Cameras' },
  { href: '/events', icon: List, label: 'Events' },
  { href: '/persons', icon: Users, label: 'Persons' },
  { href: '/watchlist', icon: ShieldAlert, label: 'Watchlist' },
  { href: '/alerts', icon: Bell, label: 'Alerts' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
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
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(145deg, #007AFF 0%, #0055D4 100%)' }}>
            <ScanLine size={18} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight" style={{ color: '#1D1D1F', letterSpacing: '-0.01em' }}>SAFE CITY</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4" style={{ height: 1, background: 'rgba(60,60,67,0.1)' }} />

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href)
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

      {/* Footer */}
      <div className="px-5 py-4">
        <p className="text-xs" style={{ color: '#C7C7CC' }}>ROC SDK 3.14.2 · Active</p>
      </div>
    </aside>
  )
}
