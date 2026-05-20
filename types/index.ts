export interface BoundingBox {
  x: number; y: number; width: number; height: number; rotation: number
}

export interface VehicleInfo {
  make?: string
  model?: string
  color?: string
  type?: string
  view?: string
  thumbnail?: string
  confidence: number
  boundingBox: BoundingBox
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
  vehicleMake?: string
  vehicleModel?: string
  vehicleColor?: string
  vehicleThumbnail?: string
  direction?: 'left' | 'right' | 'stationary'
}

export interface FaceResult {
  confidence: number
  quality: number
  boundingBox: BoundingBox
  thumbnail?: string
  personId?: string
  personName?: string
  similarity?: number
  spoofScore?: number
  spoofDetected?: boolean
  occluded?: boolean
}

export interface DetectionResult {
  success: boolean
  count: number
  plates: PlateResult[]
  faces: FaceResult[]
  vehicles: VehicleInfo[]
  processingTimeMs: number
  gunDetected: boolean
}

export interface CombinedResult {
  frameIndex: number
  plates: PlateResult[]
  faces: FaceResult[]
  vehicles: VehicleInfo[]
  processingTimeMs: number
  gunDetected: boolean
}

export interface DetectionEvent {
  id: string
  plateText: string
  confidence: number
  source: 'image' | 'video' | 'stream' | 'camera'
  personId?: string
  personName?: string
  thumbnailBase64?: string
  vehicleMake?: string
  vehicleModel?: string
  vehicleColor?: string
  direction?: 'left' | 'right' | 'stationary'
  cameraId?: string
  cameraName?: string
  gunDetected?: boolean
  x: number; y: number; width: number; height: number
  timestamp: string
}

export interface FaceEvent {
  id: string
  personId?: string
  personName?: string
  confidence: number
  quality: number
  spoofScore?: number
  spoofDetected: boolean
  occluded: boolean
  thumbnailBase64?: string
  cameraId?: string
  cameraName?: string
  detectionEventId?: string
  x: number; y: number; width: number; height: number
  timestamp: string
}

export interface Person {
  id: string
  name: string
  plateNumbers: string[]
  notes?: string
  faceThumbnail?: string
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
  personName?: string
  personFaceThumbnail?: string
  acknowledged: boolean
  timestamp: string
}

export interface Camera {
  id: string
  name: string
  url: string
  region: string
  frameStep: number
  active: boolean
  notes?: string
  zone?: string
  lat?: number
  lng?: number
  roiInclude?: { x: number; y: number; width: number; height: number }[]
  roiExclude?: { x: number; y: number; width: number; height: number }[]
  createdAt: string
  streaming?: boolean
}

export interface HealthStatus {
  status: 'ok' | 'error'
  rocInitialized: boolean
  modelPath: string
  error?: string
}

export interface JourneySighting {
  id: string
  cameraId?: string
  cameraName?: string
  zone?: string
  lat?: number
  lng?: number
  seenAt: string
  thumbnailBase64?: string
  confidence: number
  detectionEventId?: string
}

export interface Journey {
  id: string
  plateText: string
  status: 'active' | 'closed'
  startedAt: string
  lastSeenAt: string
  sightings: JourneySighting[]
}
