import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { listComplaints } from '../lib/api.js'
import { PRIORITY_COLORS, RESOLVED_STATUSES } from '../components/severity.js'

const KOCHI_CENTER = [10.01, 76.31]

// CartoDB dark basemap — matches the plum theme, no API key
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

function markerColor(c) {
  if (RESOLVED_STATUSES.includes(c.status)) return '#34d399'
  return PRIORITY_COLORS[c.priority?.level] ?? '#eab308'
}

const LEGEND = [
  ['#ef4444', 'Critical'],
  ['#f97316', 'High'],
  ['#eab308', 'Medium / Low'],
  ['#34d399', 'Resolved'],
]

const STATUS_FILTERS = ['All', 'Active', 'Critical', 'Resolved']

export default function CityMap() {
  const [complaints, setComplaints] = useState([])
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('All')

  useEffect(() => {
    listComplaints().then((all) => setComplaints(all.filter((c) => !c.duplicate_of)))
  }, [])

  const categories = useMemo(
    () => ['All', ...new Set(complaints.map((c) => c.ai?.category ?? c.category))],
    [complaints],
  )

  const filtered = complaints.filter((c) => {
    const cat = c.ai?.category ?? c.category
    if (category !== 'All' && cat !== category) return false
    if (status === 'Active' && RESOLVED_STATUSES.includes(c.status)) return false
    if (status === 'Resolved' && !RESOLVED_STATUSES.includes(c.status)) return false
    if (status === 'Critical' && c.priority?.level !== 'CRITICAL') return false
    return true
  })

  const criticalCount = filtered.filter((c) => c.priority?.level === 'CRITICAL').length
  const resolvedCount = filtered.filter((c) => RESOLVED_STATUSES.includes(c.status)).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">City Map</h1>
        <p className="mt-1 text-sm text-sakura-100/50">
          Live complaint map of Kochi. Marker size reflects how many citizens
          reported the same issue.
        </p>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-sakura-300/15 bg-plum-950/50 p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                status === s
                  ? 'bg-sakura-500 text-white'
                  : 'text-sakura-100/60 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-sakura-300/15 bg-plum-950/50 px-3 py-2 text-sm focus:border-sakura-400 focus:outline-none"
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-sakura-100/60">
            <span className="font-bold text-white">{filtered.length}</span> shown
          </span>
          <span className="text-sakura-100/60">
            <span className="font-bold text-red-400">{criticalCount}</span> critical
          </span>
          <span className="text-sakura-100/60">
            <span className="font-bold text-emerald-400">{resolvedCount}</span> resolved
          </span>
        </div>
      </div>

      {/* map */}
      <div className="relative overflow-hidden rounded-2xl border border-sakura-300/15 shadow-xl shadow-plum-950/50">
        <MapContainer
          center={KOCHI_CENTER}
          zoom={12}
          style={{ height: 560, width: '100%', background: '#100610' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap &copy; CARTO'
            url={DARK_TILES}
          />
          {filtered.map((c) => {
            const color = markerColor(c)
            const radius = 7 + Math.min(c.report_count, 12) * 1.4
            return (
              <CircleMarker
                key={c.id}
                center={[c.location.lat, c.location.lng]}
                radius={radius}
                pathOptions={{
                  color: '#ffffff',
                  weight: 1.5,
                  opacity: 0.6,
                  fillColor: color,
                  fillOpacity: 0.85,
                }}
              >
                <Popup className="bh7-popup">
                  <div style={{ minWidth: 210 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <strong style={{ color: '#ff7fae' }}>{c.id}</strong>
                      {c.priority && (
                        <span style={{ color, fontWeight: 600, fontSize: 12 }}>
                          {c.priority.level} · {c.priority.score}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '8px 0 6px' }}>{c.description}</p>
                    <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
                      {c.ai?.category ?? c.category} · {c.status} · {c.report_count}{' '}
                      report{c.report_count > 1 ? 's' : ''}
                    </p>
                    {c.image_url && (
                      <img
                        src={c.image_url}
                        alt=""
                        style={{ marginTop: 8, maxWidth: '100%', borderRadius: 8 }}
                      />
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>

        {/* legend */}
        <div className="absolute bottom-4 left-4 z-[1000] rounded-xl border border-sakura-300/20 bg-plum-950/85 px-4 py-3 text-xs backdrop-blur-md">
          <p className="mb-2 font-semibold uppercase tracking-wider text-sakura-100/50">
            Priority
          </p>
          {LEGEND.map(([color, label]) => (
            <div key={label} className="flex items-center gap-2 py-0.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
              />
              <span className="text-sakura-100/80">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
