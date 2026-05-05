'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Camera, List, Users, ShieldAlert, Bell, Activity,
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
    <aside className="fixed top-0 left-0 h-screen w-[240px] bg-slate-900 flex flex-col z-50">
      <div className="px-6 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">ALPR System</p>
            <p className="text-slate-400 text-xs">License Plate AI</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative
                ${active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Icon size={18} />
              {label}
              {label === 'Alerts' && alertCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-slate-700/50">
        <p className="text-slate-500 text-xs">ROC SDK 3.14 · Active</p>
      </div>
    </aside>
  )
}
