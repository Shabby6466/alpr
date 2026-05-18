const BASE = '/api'

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || 'Request failed')
  }
  return res.json()
}

function json(body: unknown): RequestInit {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

export const api = {
  health: () => req('/alpr/health'),

  detect: (formData: FormData, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params) : ''
    return req<any>(`/alpr/detect${qs}`, { method: 'POST', body: formData })
  },

  detectUrl: (body: Record<string, unknown>) =>
    req<any>('/alpr/detect-url', { method: 'POST', ...json(body) }),

  detectStream: (body: Record<string, unknown>) =>
    fetch(`${BASE}/alpr/detect-stream`, { method: 'POST', ...json(body) }),

  // Events & Reporting
  getEvents: (params?: Record<string, string>) =>
    req<{ total: number; data: any[] }>(`/events?${new URLSearchParams(params ?? {})}`),
  getStats: (days = 7) => req<any[]>(`/events/stats?days=${days}`),
  getTopPlates: (limit = 10) => req<any[]>(`/events/top-plates?limit=${limit}`),
  getTopPersons: (limit = 10) => req<any[]>(`/events/top-persons?limit=${limit}`),
  getVehicleStats: (days = 30) => req<{ makes: any[]; colors: any[] }>(`/events/vehicle-stats?days=${days}`),
  getSourceBreakdown: (days = 7) => req<any[]>(`/events/source-breakdown?days=${days}`),
  deleteEvent: (id: string) => fetch(`${BASE}/events/${id}`, { method: 'DELETE' }),

  // Persons
  getPersons: () => req<any[]>('/persons'),
  getPerson:  (id: string) => req<any>(`/persons/${id}`),
  createPerson: (body: unknown) => req<any>('/persons', { method: 'POST', ...json(body) }),
  updatePerson: (id: string, body: unknown) => req<any>(`/persons/${id}`, { method: 'PUT', ...json(body) }),
  deletePerson: (id: string) => fetch(`${BASE}/persons/${id}`, { method: 'DELETE' }),
  enrollFace: (id: string, formData: FormData) => req<any>(`/persons/${id}/enroll-face`, { method: 'POST', body: formData }),

  // Watchlist
  getWatchlist: (params?: Record<string, string>) =>
    req<any[]>(`/watchlist?${new URLSearchParams(params ?? {})}`),
  createWatchlist: (body: unknown) => req<any>('/watchlist', { method: 'POST', ...json(body) }),
  updateWatchlist: (id: string, body: unknown) =>
    req<any>(`/watchlist/${id}`, { method: 'PATCH', ...json(body) }),
  deleteWatchlist: (id: string) => fetch(`${BASE}/watchlist/${id}`, { method: 'DELETE' }),

  // Alerts
  getAlerts: (params?: Record<string, string>) =>
    req<any[]>(`/alerts?${new URLSearchParams(params ?? {})}`),
  acknowledgeAlert: (id: string) =>
    req<any>(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),
  deleteAlert: (id: string) => fetch(`${BASE}/alerts/${id}`, { method: 'DELETE' }),

  // Cameras
  getCameras: () => req<any[]>('/cameras'),
  getCamera: (id: string) => req<any>(`/cameras/${id}`),
  createCamera: (body: unknown) => req<any>('/cameras', { method: 'POST', ...json(body) }),
  updateCamera: (id: string, body: unknown) => req<any>(`/cameras/${id}`, { method: 'PATCH', ...json(body) }),
  deleteCamera: (id: string) => fetch(`${BASE}/cameras/${id}`, { method: 'DELETE' }),

  // Face Events
  getFaceEvents: (params?: Record<string, string>) =>
    req<{ total: number; data: any[] }>(`/face-events?${new URLSearchParams(params ?? {})}`),
}
