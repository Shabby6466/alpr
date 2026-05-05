'use client'
import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  connected: boolean
}

export default function TopBar({ title, subtitle, connected }: Props) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="font-semibold text-slate-800 text-base">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${connected ? 'text-green-600' : 'text-slate-400'}`}>
          {connected
            ? <><span className="w-2 h-2 rounded-full bg-green-500 pulse-dot" />Live</>
            : <><WifiOff size={13} />Offline</>}
        </div>
        <span className="text-slate-400 text-xs font-mono">{time}</span>
      </div>
    </header>
  )
}
