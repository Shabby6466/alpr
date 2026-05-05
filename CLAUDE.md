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
PlateResult       // text, confidence, quality, boundingBox, thumbnail?, region?, state?, personId?, personName?
DetectionResult   // success, count, plates, processingTimeMs
DetectionEvent    // id, plateText, confidence, source, personId?, personName?, thumbnailBase64?, x/y/width/height, timestamp
Person            // id, name, plateNumbers[], notes?, createdAt, visits?
WatchlistEntry    // id, plateText, reason?, active, createdAt
Alert             // id, plateText, watchlistEntryId, detectionEventId, reason?, thumbnailBase64?, acknowledged, timestamp
HealthStatus      // status, rocInitialized, modelPath, error?
```

## API Client (`lib/api.ts`)

All backend calls go through the `api` object. Throws `Error` with the server's `message` field on non-2xx responses.

```typescript
api.health()
api.detect(formData, params?)          // POST /api/alpr/detect
api.detectUrl(body)                    // POST /api/alpr/detect-url
api.detectStream(body)                 // POST /api/alpr/detect-stream (returns native Response for SSE)
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
- **Image tab**: drag-drop zone or click-to-upload. Region selector (North American / European / Pacific). Shows plate cards with thumbnail, confidence badge, bounding box, person match.
- **Video tab**: file upload, streams SSE response from `POST /api/alpr/detect-video`. Results appear per-frame as they arrive. Shows unique plate count on completion. Max size 1GB.
- **Live Feed tab**: RTSP/HTTP stream URL input. Monitoring for plates in real-time. Shows scrollable "Recent Detections" list (last 50 frames). Automatically handles timestamp synchronization.

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

## Styling Conventions

- **`.plate-badge`** (in `globals.css`): monospace font, yellow-50 background, yellow-300 border, rounded, small padding. Used universally for displaying plate numbers.
- **`.pulse-dot`**: CSS keyframe animation on a small circle — indicates live connection.
- Tailwind: no config file — using v4's CSS-first config. No `tailwind.config.js` exists.
- Color language: blue = detection/primary actions; amber = watchlist; red = alerts; violet = video; green = success/acknowledged.

## Layout Architecture

`layout.tsx` is `'use client'` (required for SSE and useState). The `AppShell` component:
- Renders the fixed `Sidebar` (240px) and a `flex-col` main area with `ml-[240px]`.
- Seeds the initial unacknowledged alert count from `GET /api/alerts?acknowledged=false` on mount.
- Increments alert count via SSE `/api/alerts/stream` for real-time badge updates.
- Wraps everything in `ToastProvider`.

## Data Flow Pattern

All pages follow the same pattern:
1. `useSWR('/api/...')` for initial data load and background refresh.
2. `api.*()` calls for mutations, wrapped in try/catch that calls `toast(e.message, 'error')`.
3. `mutate()` after every successful mutation to revalidate SWR cache.
4. `useSSE()` where real-time updates are needed — updates local state and/or calls `mutate()`.

## Known Constraints

- `layout.tsx` uses `'use client'` — there is no RSC data fetching. All data is client-side.
- Video/Stream detection SSE (`/api/alpr/detect-video` and `/detect-stream`) are consumed with a manual `ReadableStream` reader, not `EventSource`, because they are `POST` requests.
- Next.js 16 / React 19 — some third-party libraries may not be compatible. Check peer deps before adding packages.
- The workspace-root warning about multiple lockfiles (`/Users/Akmal/package-lock.json` vs this project's) is cosmetic and does not affect functionality.
