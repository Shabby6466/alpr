'use client'
import './globals.css'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/ui/Sidebar'
import { ToastProvider } from '@/components/ui/Toast'
import { useSSE } from '@/lib/useSSE'
import { Alert } from '@/types'

function AppShell({ children }: { children: React.ReactNode }) {
  const [alertCount, setAlertCount] = useState(0)

  // Seed initial unacknowledged count
  useEffect(() => {
    fetch('/api/alerts?acknowledged=false')
      .then(r => r.json())
      .then((a: Alert[]) => setAlertCount(a.length))
      .catch(() => {})
  }, [])

  useSSE<Alert>('/api/alerts/stream', (alert) => {
    if (!alert.acknowledged) setAlertCount(n => n + 1)
  })

  return (
    <div className="flex min-h-screen">
      <Sidebar alertCount={alertCount} />
      <div className="flex-1 ml-[240px] flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>ALPR System</title>
        <meta name="description" content="Automatic License Plate Recognition" />
      </head>
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  )
}
