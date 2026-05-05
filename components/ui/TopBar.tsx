'use client'
import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  connected?: boolean
}

export default function TopBar({ title, subtitle, connected }: Props) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header
      className="h-14 sticky top-0 z-10 flex items-center justify-between px-6"
      style={{
        background: 'rgba(242,242,247,0.85)',
        borderBottom: '1px solid rgba(60,60,67,0.1)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <div>
        <h1 className="font-bold text-base leading-tight" style={{ color: '#1D1D1F', letterSpacing: '-0.015em' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: '#6E6E73' }}>{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {connected ? (
          <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ color: '#30D158', background: 'rgba(48,209,88,0.1)', letterSpacing: '0.02em' }}>
            <span className="live-ring" />
            LIVE
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: '#AEAEB2' }}>
            <WifiOff size={12} strokeWidth={2} />
            Offline
          </div>
        )}
        <span className="text-xs font-mono tabular-nums" style={{ color: '#AEAEB2' }}>{time}</span>
      </div>
    </header>
  )
}
