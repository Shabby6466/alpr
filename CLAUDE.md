# ALPR Frontend — AI Context

Next.js 16 (App Router) frontend for the ALPR system. Communicates with the NestJS backend at `localhost:3000` via a rewrite proxy. All `/api/*` requests are transparently forwarded — no CORS issues, no hardcoded backend URLs in components.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.2.4 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Data fetching | SWR 2 |
| Icons | lucide-react 1.14 |
| React | 19 |

## Running

```bash
npm run dev -- --port 3001   # backend occupies 3000
```

The backend must be running at `localhost:3000` for API calls to resolve. Start order: backend first, then frontend.

## Proxy Configuration

`next.config.ts` rewrites `/api/:path*` → `http://localhost:3000/api/:path*`. This means:
- Every `fetch('/api/...')` call in the browser hits the Next.js dev server, which proxies it to NestJS.
- No `NEXT_PUBLIC_API_URL` env var is needed — always use relative `/api/` paths.

## Project Structure

```
alpr-frontend/
├── next.config.ts              # Rewrite proxy to localhost:3000
├── types/index.ts              # All shared TypeScript interfaces
├── lib/
│   ├── api.ts                  # Typed fetch wrappers for all backend endpoints
│   └── useSSE.ts               # Custom hook for SSE connections with auto-reconnect
├── app/
│   ├── globals.css             # Tailwind base + .plate-badge + .pulse-dot keyframes
│   ├── layout.tsx              # Root layout — AppShell (Sidebar + alert count SSE), ToastProvider
│   ├── page.tsx                # Dashboard — stat cards, live detection feed, active alerts panel
│   ├── detect/page.tsx         # Image upload + drag-drop detection; video upload + SSE frame stream
│   ├── events/page.tsx         # Paginated events table with plate/source filters + SSE new-event banner
│   ├── persons/page.tsx        # Person grid — add/edit modal, visit history modal
│   ├── watchlist/page.tsx      # Watchlist cards — active toggle, add modal, delete
│   └── alerts/page.tsx         # Alerts table — acknowledge, bulk-ack, delete, SSE live banner
└── components/
    └── ui/
        ├── Sidebar.tsx         # Fixed 240px dark sidebar — nav links, alert badge
        ├── TopBar.tsx          # Page title, live indicator dot, clock
        ├── Toast.tsx           # ToastProvider + useToast() hook — 4s auto-dismiss
        └── Modal.tsx           # Backdrop modal — Escape key close, scrollable body
```

## Shared Types (`types/index.ts`)

```typescript
PlateResult       // text, confidence, quality, boundingBox, thumbnail?, region?, state?,
                  // personId?, personName?, vehicleMake?, vehicleModel?, vehicleColor?,
                  // vehicleThumbnail?, direction?
FaceResult        // boundingBox, confidence, quality, spoofScore?, spoofDetected?,
                  // occluded?, personId?, personName?, thumbnail?
VehicleResult     // make?, model?, color?, confidence, boundingBox, thumbnail?
DetectionResult   // success, count, plates, faces, vehicles, processingTimeMs, gunDetected
DetectionEvent    // id, plateText, confidence, source, personId?, personName?,
                  // thumbnailBase64?, x/y/width/height, vehicleMake?, vehicleModel?,
                  // vehicleColor?, vehicleThumbnail?, direction?, cameraId?, cameraName?,
                  // gunDetected, timestamp
Person            // id, name, plateNumbers[], notes?, createdAt, visits?
WatchlistEntry    // id, plateText, reason?, active, createdAt
Alert             // id, plateText, watchlistEntryId, detectionEventId, reason?, thumbnailBase64?, acknowledged, timestamp
HealthStatus      // status, rocInitialized, modelPath, capabilities: { lpr, face, vehicle, gun }, error?
```

## API Client (`lib/api.ts`)

All backend calls go through the `api` object. Throws `Error` with the server's `message` field on non-2xx responses.

```typescript
api.health()
api.detect(formData, params?)          // POST /api/alpr/detect — params includes sessionId?
api.detectUrl(body)                    // POST /api/alpr/detect-url
api.detectStream(body)                 // POST /api/alpr/detect-stream (returns native Response for SSE)
api.flushSession(sessionId)            // POST /api/alpr/sessions/:sessionId/flush
api.getEvents(params?)                 // GET  /api/events
api.deleteEvent(id)
api.getPersons()
api.getPerson(id)                      // returns person + visits[]
api.createPerson(body)
api.updatePerson(id, body)
api.deletePerson(id)
api.getWatchlist(params?)
api.createWatchlist(body)
api.updateWatchlist(id, body)          // { active?, reason? }
api.deleteWatchlist(id)
api.getAlerts(params?)
api.acknowledgeAlert(id)
api.deleteAlert(id)
```

## SSE Hook (`lib/useSSE.ts`)

```typescript
const { connected } = useSSE<T>(url, callback)
```

- Connects via `EventSource` to the given URL.
- Listens for `message`, `detection`, and `alert` event types — calls `callback` for each.
- Auto-reconnects every 5 seconds on error.
- Returns `connected: boolean` for UI indicators.

Used in: `layout.tsx` (alert count), `page.tsx` (dashboard feed + alerts), `events/page.tsx` (new-event banner), `alerts/page.tsx` (live count banner).

## Page Summaries

### Dashboard (`/`)
- 4 stat cards: detections today, registered persons, active alerts, watchlist entries.
- Live detection feed: SSE at `/api/events/stream` prepends events; falls back to SWR polling every 30s.
- Active alerts panel: SSE at `/api/alerts/stream` + SWR poll every 10s.

### Detection (`/detect`)
- **Image tab**: drag-drop zone or click-to-upload. Region selector. Shows plate cards with thumbnail, confidence badge, bounding box overlay, person match, vehicle info.
- **Video tab**: client-side frame capture (not server-side SSE video upload).
  - On start: generates a UUID `sessionId` via `crypto.randomUUID()` stored in `sessionIdRef`.
  - Each frame captured from `<video>` element → canvas → JPEG blob → `POST /api/alpr/detect?sessionId=<uuid>&thumbnail=true`.
  - Backend accumulates plates into `VehicleTracker` per session — no DB writes yet.
  - On stop or `onEnded`: calls `POST /api/alpr/sessions/:sessionId/flush` → commits one best reading per tracked vehicle to DB + SSE.
  - Detection feed cards show plate text, confidence, plate thumbnail (base64 JPEG), face thumbnail.
  - `thumbnail=true` is always sent so the feed always has plate crop images.
- **Live Feed tab**: RTSP/HTTP stream URL input. Monitoring for plates in real-time. Shows scrollable "Recent Detections" list (last 50 frames).

### Region selector
- **North American / Pakistan ★** (`NORTH_AMERICAN`) — correct region for Pakistani plates. Labeled with ★ to guide users.
- **Asian (East Asia)** (`ASIAN`) — East Asian plate formats only (Chinese/Japanese/Korean). **Do not use for Pakistani plates.**
- Region order in selector: North American, European, Middle Eastern, Asian, Pacific, African, South American.

### Events Log (`/events`)
- Table: thumbnail, plate badge, confidence badge (green ≥90%, amber ≥70%, red <70%), person name, source badge, timestamp.
- Filters: plate text search, source dropdown. Clear button appears when filters active.
- Pagination: 25 per page, previous/next controls, page indicator.
- SSE banner: shows count of new events since last load; click to refresh.

### Persons (`/persons`)
- Grid of cards showing name, notes, plate badges, date added.
- Add/Edit modal: name field, textarea for plates (one per line), notes.
- View History modal: lists all detection events for this person's plates, with thumbnails.

### Watchlist (`/watchlist`)
- Grid of cards. Amber border/icon when active, muted when inactive.
- Toggle button per card (ToggleRight/ToggleLeft) calls `PATCH /api/watchlist/:id { active }`.
- "Active only" toggle at top filters the SWR key (`?activeOnly=true`).
- Add modal: plate text (auto-uppercased), optional reason.

### Alerts (`/alerts`)
- Table: thumbnail, plate, reason, status badge (Active in red / Acknowledged in grey), timestamp.
- Acknowledge single row or "Acknowledge all" button (visible when unacknowledged > 0).
- "Show acknowledged" toggle changes SWR key (omits `?acknowledged=false`).
- SSE live counter banner; click to refresh.

## Apple Design Language Guidelines

The frontend follows a premium, high-fidelity Apple-inspired design language. Adhere to these patterns for all new UI work:

### Visual Principles
- **Cleanliness**: Use white backgrounds with extremely soft, layered shadows (`box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)`).
- **Glassmorphism**: Use translucent backgrounds for persistent UI (Sidebar, TopBar, Modals) with `backdrop-filter: blur(20px) saturate(180%)`.
- **Softness**: Standard border radius is `16px` for cards, `12px` for inputs/pills, and `24px` for modals.
- **High Contrast**: Use deep blacks (`#1D1D1F`) for primary text and system gray (`#8E8E93`) for secondary.

### Color Palette (System Colors)
- **Primary Blue**: `#007AFF` (Primary actions, active states)
- **System Green**: `#30D158` (Success, resolved, low-priority)
- **System Red**: `#FF3B30` (Alerts, errors, high-priority)
- **System Orange**: `#FF9500` (Watchlist, warnings, medium-priority)
- **System Background**: `#F2F2F7` (Main page background)

### Typography
- **Font**: San Francisco (SF Pro) / System Default.
- **Tracking**: Use slightly negative tracking for headings (`letter-spacing: -0.015em`).
- **Data**: Use `font-mono` and `tabular-nums` for timestamps, IDs, and confidence scores.
- **Badges**: Use `text-[10px]` or `text-[11px]` with `font-black` and `uppercase` for status indicators.

### UI Components
- **Sidebar**: Fixed 240px width, `rgba(246,246,246,0.88)` background, blurred.
- **TopBar**: 56px height, translucent white, refined 1px bottom border.
- **Apple Card**: White background, soft shadow, `p-5` padding.
- **Segmented Control**: Apple-style tabs with a white pill sliding over a gray background.
- **Buttons**: `.btn-apple` for primary actions (Blue background, white text, bold).

### Animations
- **`sfPulse`**: Subtle opacity pulse (2s) for live status dots.
- **`sfPing`**: Scaled ring animation for critical alerts.
- **Transitions**: Use `animate-in fade-in slide-in-from-bottom-4` for new content appearing.
- **Hover States**: Subtle scale-up (`hover:scale-[1.01]`) or background shift (`hover:bg-slate-50/50`).
