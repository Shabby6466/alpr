'use client'
import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import GlobalSearch from './GlobalSearch'

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
      className="h-14 sticky top-0 z-10 flex items-center justify-between px-6 gap-8"
      style={{
        background: 'rgba(242,242,247,0.85)',
        borderBottom: '1px solid rgba(60,60,67,0.1)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <div className="flex-shrink-0 min-w-[200px]">
        <h1 className="font-bold text-base leading-tight" style={{ color: '#1D1D1F', letterSpacing: '-0.015em' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: '#8E8E93' }}>{subtitle}</p>
        )}
      </div>

      <div className="flex-1 flex justify-center max-w-xl">
        <GlobalSearch />
      </div>
    </header>
  )
}
