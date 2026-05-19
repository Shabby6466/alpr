'use client'
import { useEffect, useRef } from 'react'
import { getAllVideos, CameraVideoEntry } from '@/lib/cameraVideoStore'

interface ProcessorState {
  entry: CameraVideoEntry
  video: HTMLVideoElement
  canvas: HTMLCanvasElement
  objectUrl: string
  intervalId: ReturnType<typeof setInterval>
}

export default function CameraBackgroundProcessor() {
  const statesRef = useRef<Map<string, ProcessorState>>(new Map())
  const mountedRef = useRef(true)

  async function startProcessor(entry: CameraVideoEntry) {
    const existing = statesRef.current.get(entry.cameraId)
    if (existing) {
      if (existing.entry.assignedAt === entry.assignedAt) return
      stopProcessor(entry.cameraId)
    }

    const video = document.createElement('video')
    video.muted = true
    video.loop = true
    video.playsInline = true
    // Keep it in the normal flow but invisible — avoids autoplay block on off-screen elements
    video.style.cssText = 'position:fixed;bottom:0;right:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1'
    document.body.appendChild(video)

    const objectUrl = URL.createObjectURL(entry.blob)
    video.src = objectUrl

    const canvas = document.createElement('canvas')

    // Try immediate play; if blocked, retry on canplaythrough
    await video.play().catch(() => {
      return new Promise<void>(resolve => {
        const onReady = () => { video.removeEventListener('canplaythrough', onReady); video.play().catch(() => {}).then(resolve) }
        video.addEventListener('canplaythrough', onReady)
      })
    })

    const intervalMs = Math.max(1000, (entry.frameStep || 5) * 200)

    const intervalId = setInterval(async () => {
      if (!mountedRef.current) return
      if (video.readyState < 2 || video.paused) return

      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0)

      canvas.toBlob(async (blob) => {
        if (!blob || !mountedRef.current) return
        const fd = new FormData()
        fd.append('file', blob, 'frame.jpg')
        fd.append('thumbnail', 'true')
        fd.append('region', entry.region)
        fd.append('cameraId', entry.cameraId)
        fd.append('cameraName', entry.cameraName)
        try {
          const res = await fetch('/api/alpr/detect?thumbnail=true', { method: 'POST', body: fd })
          const data = await res.json().catch(() => null)
          if (data?.plates?.length) {
            const now = new Date().toISOString()
            for (const plate of data.plates) {
              window.dispatchEvent(new CustomEvent('mits-detection', {
                detail: {
                  cameraId: entry.cameraId,
                  cameraName: entry.cameraName,
                  plateText: plate.text,
                  confidence: plate.confidence ?? 0,
                  thumbnailBase64: plate.thumbnail ?? null,
                  timestamp: now,
                },
              }))
            }
          }
        } catch { /* network error — keep trying */ }
      }, 'image/jpeg', 0.82)
    }, intervalMs)

    statesRef.current.set(entry.cameraId, { entry, video, canvas, objectUrl, intervalId })
  }

  function stopProcessor(cameraId: string) {
    const state = statesRef.current.get(cameraId)
    if (!state) return
    clearInterval(state.intervalId)
    state.video.pause()
    state.video.remove()
    URL.revokeObjectURL(state.objectUrl)
    statesRef.current.delete(cameraId)
  }

  async function syncProcessors() {
    if (!mountedRef.current) return
    const entries = await getAllVideos().catch(() => [] as CameraVideoEntry[])
    const activeIds = new Set(entries.map(e => e.cameraId))

    for (const id of statesRef.current.keys()) {
      if (!activeIds.has(id)) stopProcessor(id)
    }
    for (const entry of entries) {
      await startProcessor(entry)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    syncProcessors()

    const id = setInterval(syncProcessors, 8000)
    window.addEventListener('camera-video-updated', syncProcessors)

    return () => {
      mountedRef.current = false
      clearInterval(id)
      window.removeEventListener('camera-video-updated', syncProcessors)
      for (const id of statesRef.current.keys()) stopProcessor(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
