'use client'
import { useEffect, useState } from 'react'
import { WifiOff, Radio } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  connected: boolean
}

export default function TopBar({ title, subtitle, connected }: Props) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="h-14 sticky top-0 z-10 flex items-center justify-between px-6"
      style={{
        background: 'rgba(6,11,23,0.9)',
        borderBottom: '1px solid #0f1e38',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-bold text-slate-100 text-base tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 leading-tight">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
          ${connected
            ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-900'
            : 'text-slate-500 bg-slate-900 border border-slate-800'}`}>
          {connected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              LIVE
            </>
          ) : (
            <><WifiOff size={12} />OFFLINE</>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: '#1e3a5f' }}>
          <Radio size={12} className="text-blue-800" />
          <span className="text-slate-400">{time}</span>
        </div>
      </div>
    </header>
  )
}
