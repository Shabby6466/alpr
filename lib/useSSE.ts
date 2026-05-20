'use client'
import { useEffect, useRef, useState } from 'react'

export function useSSE<T>(url: string, onMessage: (data: T) => void) {
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const connect = () => {
      const es = new EventSource(url)
      esRef.current = es

      es.addEventListener('detection', (e) => {
        try { onMessage(JSON.parse(e.data) as T) } catch {}
      })
      es.addEventListener('alert', (e) => {
        try { onMessage(JSON.parse(e.data) as T) } catch {}
      })
      es.addEventListener('face', (e) => {
        try { onMessage(JSON.parse(e.data) as T) } catch {}
      })
      es.onopen  = () => setConnected(true)
      es.onerror = () => {
        setConnected(false)
        es.close()
        setTimeout(connect, 5000)
      }
    }
    connect()
    return () => { esRef.current?.close(); setConnected(false) }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  return { connected }
}
