'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Camera, List, Users, ShieldAlert, Bell, Cpu,
} from 'lucide-react'

const nav = [
  { href: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/detect',    icon: Camera,           label: 'Detection' },
  { href: '/events',    icon: List,             label: 'Events Log' },
  { href: '/persons',   icon: Users,            label: 'Persons' },
  { href: '/watchlist', icon: ShieldAlert,      label: 'Watchlist' },
  { href: '/alerts',    icon: Bell,             label: 'Alerts' },
]

export default function Sidebar({ alertCount }: { alertCount: number }) {
  const path = usePathname()
  return (
    <aside className="fixed top-0 left-0 h-screen w-[240px] flex flex-col z-50"
      style={{ background: 'linear-gradient(180deg, #060b17 0%, #080e1e 100%)', borderRight: '1px solid #0f1e38' }}>

      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid #0f1e38' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', boxShadow: '0 0 16px rgba(29,78,216,0.5)' }}>
            <Cpu size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight tracking-wide">ALPR SYSTEM</p>
            <p className="text-xs font-medium" style={{ color: '#3b82f6' }}>ROC · AI Detection</p>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="mx-4 mt-4 mb-1 px-3 py-2 rounded-lg flex items-center gap-2"
        style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)' }}>
        <span className="relative flex h-2 w-2">
          <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-xs font-semibold text-green-400">System Online</span>
        <span className="ml-auto text-xs text-green-600">ROC 3.14</span>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group
                ${active ? 'text-white' : 'text-slate-500 hover:text-slate-200'}`}
              style={active ? {
                background: 'rgba(37,99,235,0.2)',
                border: '1px solid rgba(37,99,235,0.3)',
                boxShadow: '0 0 12px rgba(37,99,235,0.15)',
              } : {
                border: '1px solid transparent',
              }}>
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-blue-500" />
              )}
              <Icon size={17} className={active ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'} />
              {label}
              {label === 'Alerts' && alertCount > 0 && (
                <span className="ml-auto text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                  style={{ background: '#ef4444', color: '#fff', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }}>
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4" style={{ borderTop: '1px solid #0f1e38' }}>
        <p className="text-xs" style={{ color: '#1e3358' }}>v2.0.0 · Terarare Systems</p>
      </div>
    </aside>
  )
}
