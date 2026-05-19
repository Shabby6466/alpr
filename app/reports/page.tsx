'use client'
import { useState, useMemo } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/ui/TopBar'
import {
  BarChart3, Download, Car, Target, TrendingUp,
  Video, Users, Palette, MapPin,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Range = 1 | 7 | 30

const RANGE_LABELS: Record<Range, string> = { 1: 'Today', 7: 'Last 7 Days', 30: 'Last 30 Days' }

const SOURCE_COLORS: Record<string, string> = {
  camera: '#30D158',
  stream: '#007AFF',
  video: '#5856D6',
  image: '#FF9500',
}

const VEHICLE_COLOR_MAP: Record<string, string> = {
  white: '#F2F2F7', silver: '#C7C7CC', gray: '#8E8E93', grey: '#8E8E93',
  black: '#2C2C2E', red: '#FF3B30', blue: '#007AFF', green: '#30D158',
  yellow: '#FFD60A', orange: '#FF9500', brown: '#A2845E', maroon: '#8B0000',
  beige: '#D4BFA0',
}

const card = {
  background: '#FFFFFF',
  borderRadius: 16,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
}

// ─── Bucket fill ─────────────────────────────────────────────────────────────

function fillBuckets(
  raw: { time: string; count: number }[],
  days: Range,
): { label: string; value: number }[] {
  if (days === 1) {
    // 24 hourly buckets
    const map = new Map<number, number>()
    raw.forEach(r => {
      const h = parseInt(r.time.slice(11, 13), 10)
      map.set(h, (map.get(h) ?? 0) + r.count)
    })
    return Array.from({ length: 24 }, (_, h) => ({
      label: h % 6 === 0 ? `${String(h).padStart(2, '0')}:00` : '',
      value: map.get(h) ?? 0,
    }))
  }
  // Daily buckets
  const map = new Map<string, number>()
  raw.forEach(r => map.set(r.time.slice(0, 10), r.count))
  const result: { label: string; value: number }[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = days === 7
      ? d.toLocaleDateString([], { weekday: 'short' })
      : i % 5 === 0
      ? d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      : ''
    result.push({ label, value: map.get(key) ?? 0 })
  }
  return result
}

// ─── Components ──────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, icon: Icon, color, bg, sub,
}: {
  label: string; value: string | number; icon: any
  color: string; bg: string; sub?: string
}) {
  return (
    <div style={card} className="p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon size={20} style={{ color }} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[22px] font-bold tabular-nums leading-tight"
          style={{ color: '#1D1D1F', letterSpacing: '-0.02em' }}>
          {typeof value === 'number' && !isNaN(value) ? value.toLocaleString() : value}
        </p>
        <p className="text-xs font-medium mt-0.5 truncate" style={{ color: '#6E6E73' }}>{label}</p>
        {sub && <p className="text-[10px] font-semibold mt-0.5" style={{ color }}>{sub}</p>}
      </div>
    </div>
  )
}

function BarChartSVG({ data, color = '#007AFF' }: {
  data: { label: string; value: number }[]
  color?: string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 560, H = 130, padL = 4, padR = 4, padTop = 20, padBot = 22
  const chartW = W - padL - padR
  const slotW = chartW / data.length
  const gap = data.length > 15 ? 1 : data.length > 7 ? 2 : 4
  const barW = Math.max(slotW - gap, 2)

  return (
    <svg
      viewBox={`0 0 ${W} ${H + padTop + padBot}`}
      width="100%"
      style={{ height: 180, display: 'block' }}
    >
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line
          key={f}
          x1={padL} y1={padTop + H * (1 - f)}
          x2={W - padR} y2={padTop + H * (1 - f)}
          stroke="rgba(60,60,67,0.06)" strokeWidth={1}
        />
      ))}

      {data.map((d, i) => {
        const x = padL + i * slotW
        const bh = Math.max((d.value / max) * H, d.value > 0 ? 2 : 0)
        const by = padTop + H - bh
        return (
          <g key={i}>
            {bh > 0 && (
              <rect
                x={x + gap / 2} y={by}
                width={barW} height={bh}
                rx={Math.min(3, barW / 3)}
                fill={color}
                opacity={0.85}
              />
            )}
            {d.value > 0 && bh > 18 && (
              <text
                x={x + gap / 2 + barW / 2} y={by - 5}
                textAnchor="middle" fontSize={7.5} fontWeight={700}
                fill={color} fontFamily="system-ui"
              >
                {d.value}
              </text>
            )}
            {d.label && (
              <text
                x={x + gap / 2 + barW / 2}
                y={padTop + H + padBot - 3}
                textAnchor="middle" fontSize={8}
                fill="#AEAEB2" fontFamily="system-ui"
              >
                {d.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function HBarList({ items, color }: {
  items: { label: string; value: number }[]
  color: string
}) {
  const max = items[0]?.value ?? 1
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span
            className="text-xs font-bold font-mono truncate flex-shrink-0"
            style={{ width: 100, color: '#1D1D1F' }}
          >
            {item.label}
          </span>
          <div className="flex-1 relative h-[22px] rounded-md overflow-hidden" style={{ background: '#F2F2F7' }}>
            <div
              className="absolute inset-y-0 left-0 rounded-md transition-all duration-700"
              style={{ width: `${(item.value / max) * 100}%`, background: color, opacity: 0.85 }}
            />
          </div>
          <span
            className="text-xs font-bold tabular-nums flex-shrink-0 text-right"
            style={{ width: 36, color: '#1D1D1F' }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function SectionHeader({ icon: Icon, color, title, sub }: {
  icon: any; color: string; title: string; sub?: string
}) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid rgba(60,60,67,0.08)' }}>
      <Icon size={15} strokeWidth={2.5} style={{ color }} />
      <span className="font-semibold text-sm" style={{ color: '#1D1D1F' }}>{title}</span>
      {sub && <span className="text-xs ml-1" style={{ color: '#AEAEB2' }}>{sub}</span>}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-medium" style={{ color: '#AEAEB2' }}>{message}</p>
    </div>
  )
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [range, setRange] = useState<Range>(7)

  const { data: summary } = useSWR(
    `/api/events/summary?days=${range}`, fetcher, { refreshInterval: 60000 })
  const { data: statsRaw = [] } = useSWR(
    `/api/events/stats?days=${range}`, fetcher, { refreshInterval: 60000 })
  const { data: topPlates = [] } = useSWR(
    `/api/events/top-plates?limit=10&days=${range}`, fetcher)
  const { data: topCameras = [] } = useSWR(
    `/api/events/top-cameras?limit=10&days=${range}`, fetcher)
  const { data: topPersons = [] } = useSWR(
    `/api/events/top-persons?limit=10`, fetcher)
  const { data: sourceBreakdown = [] } = useSWR(
    `/api/events/source-breakdown?days=${range}`, fetcher)
  const { data: vehicleStats } = useSWR(
    `/api/events/vehicle-stats?days=${range}`, fetcher)

  const chartBuckets = useMemo(() => fillBuckets(statsRaw, range), [statsRaw, range])

  const totalSource = sourceBreakdown.reduce((s: number, d: any) => s + parseInt(d.count), 0)
  const makes: { make: string; count: string }[] = vehicleStats?.makes ?? []
  const colors: { color: string; count: string }[] = vehicleStats?.colors ?? []

  function handleExport() {
    const plates = (topPlates as { plate: string; count: string }[])
    const cameras = (topCameras as { camera: string; count: string }[])
    const rows: string[][] = [
      [`ALPR Report — ${RANGE_LABELS[range]}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['SUMMARY'],
      ['Total Detections', String(summary?.total ?? '')],
      ['Unique Plates', String(summary?.uniquePlates ?? '')],
      ['Avg Confidence', summary?.avgConfidence != null
        ? `${(summary.avgConfidence * 100).toFixed(1)}%` : ''],
      [],
      ['TOP PLATES', 'DETECTIONS'],
      ...plates.map(p => [p.plate, p.count]),
      [],
      ['CAMERA ACTIVITY', 'DETECTIONS'],
      ...cameras.map(c => [c.camera, c.count]),
      [],
      ['VEHICLE MAKES', 'COUNT'],
      ...makes.map(m => [m.make, m.count]),
      [],
      ['VEHICLE COLORS', 'COUNT'],
      ...colors.map(c => [c.color, c.count]),
    ]
    downloadCSV(rows, `alpr-report-${range}d-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <>
      <TopBar title="Analytics & Reports" subtitle="Historical intelligence" connected={false} />
      <main className="flex-1 p-6 space-y-4 overflow-auto">

        {/* Controls row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Range segmented control */}
          <div
            className="flex p-1 rounded-[10px]"
            style={{ background: '#EBEBF0' }}
          >
            {([1, 7, 30] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: range === r ? '#fff' : 'transparent',
                  color: range === r ? '#1D1D1F' : '#6E6E73',
                  boxShadow: range === r ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: '#F2F2F7',
              color: '#007AFF',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,122,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = '#F2F2F7')}
          >
            <Download size={14} strokeWidth={2.5} />
            Export CSV
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            label="Total Detections"
            value={summary?.total ?? '—'}
            icon={Car}
            color="#007AFF"
            bg="rgba(0,122,255,0.1)"
          />
          <SummaryCard
            label="Unique Plates"
            value={summary?.uniquePlates ?? '—'}
            icon={Target}
            color="#5856D6"
            bg="rgba(88,86,214,0.1)"
          />
          <SummaryCard
            label="Avg Confidence"
            value={summary?.avgConfidence != null
              ? `${(summary.avgConfidence * 100).toFixed(1)}%`
              : '—'}
            icon={TrendingUp}
            color="#30D158"
            bg="rgba(48,209,88,0.1)"
          />
          <SummaryCard
            label="Active Sources"
            value={sourceBreakdown.length}
            icon={BarChart3}
            color="#FF9500"
            bg="rgba(255,149,0,0.1)"
          />
        </div>

        {/* Detections over time + Source breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Bar chart */}
          <div className="lg:col-span-2" style={card}>
            <SectionHeader
              icon={TrendingUp}
              color="#007AFF"
              title="Detections Over Time"
              sub={range === 1 ? 'by hour' : 'by day'}
            />
            <div className="px-5 py-4">
              {chartBuckets.every(b => b.value === 0)
                ? <EmptyState message="No detections in this period" />
                : <BarChartSVG data={chartBuckets} color="#007AFF" />}
            </div>
          </div>

          {/* Source breakdown */}
          <div style={card}>
            <SectionHeader icon={BarChart3} color="#FF9500" title="By Source" />
            <div className="px-5 py-4">
              {sourceBreakdown.length === 0
                ? <EmptyState message="No data" />
                : (
                  <div className="space-y-3">
                    {(sourceBreakdown as { source: string; count: string }[]).map(s => {
                      const color = SOURCE_COLORS[s.source] ?? '#8E8E93'
                      const pct = totalSource > 0 ? Math.round((parseInt(s.count) / totalSource) * 100) : 0
                      return (
                        <div key={s.source}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-sm font-semibold capitalize" style={{ color: '#1D1D1F' }}>
                              {s.source}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold tabular-nums" style={{ color }}>{pct}%</span>
                              <span className="text-xs tabular-nums font-semibold" style={{ color: '#AEAEB2' }}>
                                {parseInt(s.count).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F2F2F7' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Top plates + Camera activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <div style={card}>
            <SectionHeader icon={Car} color="#007AFF" title="Most Seen Plates" sub={RANGE_LABELS[range].toLowerCase()} />
            <div className="px-5 py-4">
              {(topPlates as any[]).length === 0
                ? <EmptyState message="No data yet" />
                : (
                  <HBarList
                    items={(topPlates as { plate: string; count: string }[]).map(p => ({
                      label: p.plate,
                      value: parseInt(p.count),
                    }))}
                    color="#007AFF"
                  />
                )}
            </div>
          </div>

          <div style={card}>
            <SectionHeader icon={Video} color="#30D158" title="Camera Activity" sub={RANGE_LABELS[range].toLowerCase()} />
            <div className="px-5 py-4">
              {(topCameras as any[]).length === 0
                ? <EmptyState message="No camera data in this period" />
                : (
                  <HBarList
                    items={(topCameras as { camera: string; count: string }[]).map(c => ({
                      label: c.camera,
                      value: parseInt(c.count),
                    }))}
                    color="#30D158"
                  />
                )}
            </div>
          </div>
        </div>

        {/* Vehicle intelligence */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <div style={card}>
            <SectionHeader icon={Car} color="#5856D6" title="Vehicle Makes" />
            <div className="px-5 py-4">
              {makes.length === 0
                ? <EmptyState message="Enable object detection to collect vehicle data" />
                : (
                  <HBarList
                    items={makes.map(m => ({ label: m.make, value: parseInt(m.count) }))}
                    color="#5856D6"
                  />
                )}
            </div>
          </div>

          <div style={card}>
            <SectionHeader icon={Palette} color="#FF9500" title="Vehicle Colors" />
            <div className="px-5 py-4">
              {colors.length === 0
                ? <EmptyState message="Enable object detection to collect color data" />
                : (
                  <div className="space-y-2.5">
                    {colors.map((c, i) => {
                      const dot = VEHICLE_COLOR_MAP[c.color?.toLowerCase()] ?? '#8E8E93'
                      const barColor = ['white', 'silver', 'beige'].includes(c.color?.toLowerCase())
                        ? '#C7C7CC'
                        : dot
                      const max = parseInt(colors[0].count)
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div
                            className="flex-shrink-0 rounded-full border"
                            style={{
                              width: 14, height: 14,
                              background: dot,
                              borderColor: 'rgba(60,60,67,0.15)',
                            }}
                          />
                          <span
                            className="text-xs font-bold font-mono capitalize flex-shrink-0"
                            style={{ width: 82, color: '#1D1D1F' }}
                          >
                            {c.color}
                          </span>
                          <div className="flex-1 relative h-[22px] rounded-md overflow-hidden" style={{ background: '#F2F2F7' }}>
                            <div
                              className="absolute inset-y-0 left-0 rounded-md transition-all duration-700"
                              style={{ width: `${(parseInt(c.count) / max) * 100}%`, background: barColor, opacity: 0.85 }}
                            />
                          </div>
                          <span
                            className="text-xs font-bold tabular-nums flex-shrink-0 text-right"
                            style={{ width: 36, color: '#1D1D1F' }}
                          >
                            {parseInt(c.count).toLocaleString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Identified persons */}
        {(topPersons as any[]).length > 0 && (
          <div style={card}>
            <SectionHeader icon={Users} color="#FF3B30" title="Identified Subjects" sub="all time" />
            <div className="divide-y" style={{ '--tw-divide-opacity': 1, borderColor: 'rgba(60,60,67,0.06)' } as any}>
              {(topPersons as { name: string; id: string; count: string }[]).map((p, i) => (
                <div
                  key={i}
                  className="px-5 py-3.5 flex items-center justify-between transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.018)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold w-5 text-center tabular-nums" style={{ color: '#D1D1D6' }}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>{p.name ?? 'Unknown'}</p>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: '#AEAEB2' }}>
                        {p.id?.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold tabular-nums" style={{ color: '#1D1D1F' }}>
                      {parseInt(p.count).toLocaleString()}
                    </span>
                    <span className="text-xs" style={{ color: '#AEAEB2' }}>IDs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </>
  )
}
