import { useCallback, useEffect, useState } from 'react'
import { getQueue, getStats, updateStatus } from '../lib/api.js'
import { PRIORITY_CHIP, STATUS_STYLES } from '../components/severity.js'

const STATUS_OPTIONS = [
  'AI Verified',
  'Assigned',
  'Work Started',
  'Resolved',
]

function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-sakura-300/15 bg-plum-900/40 p-5">
      <p className="text-sm text-sakura-100/60">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-sakura-100/40">{hint}</p>}
    </div>
  )
}

export default function Admin() {
  const [stats, setStats] = useState(null)
  const [queue, setQueue] = useState([])
  const [busyId, setBusyId] = useState(null)

  const refresh = useCallback(() => {
    getStats().then(setStats)
    getQueue().then(setQueue)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function onStatusChange(id, status) {
    setBusyId(id)
    try {
      await updateStatus(id, status)
      refresh()
    } finally {
      setBusyId(null)
    }
  }

  const maxCategory = stats
    ? Math.max(1, ...Object.values(stats.by_category))
    : 1

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Authority Dashboard</h1>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile
            label="Total reports"
            value={stats.total_reports}
            hint={`${stats.total_complaints} unique issues`}
          />
          <StatTile
            label="Duplicates merged"
            value={stats.duplicates_merged}
            hint="AI deduplication"
          />
          <StatTile label="Resolved" value={stats.resolved} />
          <StatTile label="Critical zones" value={stats.critical_zones} hint="priority ≥ 85" />
          <StatTile
            label="Avg resolution"
            value={stats.avg_resolution_hours != null ? `${stats.avg_resolution_hours} h` : '—'}
          />
        </div>
      )}

      {stats && Object.keys(stats.by_category).length > 0 && (
        <div className="rounded-2xl border border-sakura-300/15 bg-plum-900/40 p-5">
          <h2 className="mb-4 font-semibold">Reports by category</h2>
          <div className="space-y-2">
            {Object.entries(stats.by_category)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3 text-sm">
                  <span className="w-44 shrink-0 truncate text-sakura-100/80">{cat}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-plum-950/60">
                    <div
                      className="h-full rounded bg-sakura-400"
                      style={{ width: `${(count / maxCategory) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-sakura-100/80">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-sakura-300/15 bg-plum-900/40 p-5">
        <h2 className="mb-4 font-semibold">
          Priority queue{' '}
          <span className="text-sm font-normal text-sakura-100/40">
            — highest priority first, never first-come-first-serve
          </span>
        </h2>
        {queue.length === 0 ? (
          <p className="text-sm text-sakura-100/60">Queue empty — all issues resolved.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sakura-300/15 text-xs text-sakura-100/40">
                  <th className="py-2 pr-3">Priority</th>
                  <th className="py-2 pr-3">Ticket</th>
                  <th className="py-2 pr-3">Issue</th>
                  <th className="py-2 pr-3">Department</th>
                  <th className="py-2 pr-3">Reports</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((c) => (
                  <tr key={c.id} className="border-b border-sakura-300/15/50 align-top">
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          PRIORITY_CHIP[c.priority.level]
                        }`}
                      >
                        {c.priority.level} · {c.priority.score}
                      </span>
                      {c.priority.near_poi && (
                        <p className="mt-1 text-xs text-sakura-100/40">{c.priority.near_poi}</p>
                      )}
                    </td>
                    <td className="py-3 pr-3 font-mono text-sakura-300">{c.id}</td>
                    <td className="max-w-xs py-3 pr-3">
                      <p className="truncate text-sakura-50">{c.description}</p>
                      <p className="text-xs text-sakura-100/40">
                        {c.ai?.category ?? c.category} ·{' '}
                        {c.ai?.estimated_resolution_time ?? '—'}
                      </p>
                    </td>
                    <td className="py-3 pr-3 text-sakura-100/80">{c.ai?.department ?? '—'}</td>
                    <td className="py-3 pr-3">
                      {c.report_count}
                      <span className="text-xs text-sakura-100/40">
                        {' '}
                        (~{c.priority.affected_population} affected)
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <select
                        value={c.status}
                        disabled={busyId === c.id}
                        onChange={(e) => onStatusChange(c.id, e.target.value)}
                        className={`rounded-lg border border-sakura-300/20 bg-white/10 px-2 py-1 text-xs ${
                          STATUS_STYLES[c.status] ? '' : ''
                        }`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
