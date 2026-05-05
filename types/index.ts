export interface BoundingBox {
  x: number; y: number; width: number; height: number; rotation: number
}

export interface PlateResult {
  text: string
  confidence: number
  quality: number
  boundingBox: BoundingBox
  thumbnail?: string
  region?: string
  state?: string
  personName?: string
}

export interface FaceResult {
  confidence: number
  quality: number
  boundingBox: BoundingBox
  thumbnail?: string
  personId?: string
  personName?: string
  similarity?: number
}

export interface DetectionResult {
  success: boolean
  count: number
  plates: PlateResult[]
  faces: FaceResult[]
  processingTimeMs: number
}

export interface CombinedResult {
  frameIndex: number
  plates: PlateResult[]
  faces: FaceResult[]
  processingTimeMs: number
}

export interface DetectionEvent {
  id: string
  plateText: string
  confidence: number
  source: 'image' | 'video' | 'stream'
  personId?: string
  personName?: string
  thumbnailBase64?: string
  x: number; y: number; width: number; height: number
  timestamp: string
}

export interface Person {
  id: string
  name: string
  plateNumbers: string[]
  notes?: string
  createdAt: string
  visits?: DetectionEvent[]
}

export interface WatchlistEntry {
  id: string
  plateText: string
  reason?: string
  active: boolean
  createdAt: string
}

export interface Alert {
  id: string
  plateText: string
  watchlistEntryId: string
  detectionEventId: string
  reason?: string
  thumbnailBase64?: string
  acknowledged: boolean
  timestamp: string
}

export interface HealthStatus {
  status: 'ok' | 'error'
  rocInitialized: boolean
  modelPath: string
  error?: string
}
