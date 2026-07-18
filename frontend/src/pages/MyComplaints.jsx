import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyComplaints, verifyComplaint } from '../lib/api.js'
import { SEVERITY_STYLES, STATUS_STYLES } from '../components/severity.js'

const ACTION_STAGES = ['Submitted', 'AI Verified', 'Assigned', 'Work Started', 'Resolved', 'Citizen Verified']

function ActionTracker({ complaint }) {
  const current = ACTION_STAGES.indexOf(complaint.status)
  const progress = current < 0 ? 1 : current
  const label = complaint.status === 'Merged'
    ? 'Your report is registered and linked to an existing municipal case.'
    : current < 2
      ? 'Your report is registered. Municipal assignment is pending.'
      : current === 2
        ? 'The municipality has acknowledged this issue and assigned it.'
        : current === 3
          ? 'Municipal work is in progress.'
          : current >= 4
            ? 'The municipality marked the work complete. Your verification helps close the loop.'
            : 'Status is being updated.'

  return (
    <div className="mt-4 rounded-xl border border-sakura-300/15 bg-plum-950/40 p-3">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-sakura-100">Municipality action tracker</p><span className="text-xs text-sakura-100/45">Live status</span></div>
      <p className="mt-1 text-xs text-sakura-100/65">{label}</p>
      {complaint.status !== 'Merged' && <div className="mt-3 flex items-start justify-between gap-1">
        {ACTION_STAGES.slice(0, 5).map((stage, i) => (
          <div key={stage} className="flex flex-1 flex-col items-center gap-1 text-center">
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${i <= progress ? 'bg-sakura-500 text-white' : 'bg-white/10 text-sakura-100/40'}`}>{i < progress ? '✓' : i + 1}</span>
            <span className={`text-[10px] leading-tight ${i <= progress ? 'text-sakura-200' : 'text-sakura-100/35'}`}>{stage}</span>
          </div>
        ))}
      </div>}
    </div>
  )
}

function VerifyBlock({ complaint, onDone }) {
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState(null)

  async function verify(result) {
    setBusy(true)
    try {
      await verifyComplaint(complaint.id, { result, imageFile: file })
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
      <p className="text-sm font-medium text-emerald-300">
        Authority marked this resolved — please verify:
      </p>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="mt-2 block w-full text-xs text-sakura-100/60 file:mr-2 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-sakura-50"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {['Fixed', 'Partially Fixed', 'Not Fixed'].map((r) => (
          <button
            key={r}
            disabled={busy}
            onClick={() => verify(r)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${
              r === 'Not Fixed'
                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-sakura-100/40">
        Confirming a real fix earns +30 Civic Points.
      </p>
    </div>
  )
}

export default function MyComplaints() {
  const [complaints, setComplaints] = useState(null)
  const [lastChecked, setLastChecked] = useState(null)

  function refresh() {
    getMyComplaints().then((items) => {
      setComplaints(items)
      setLastChecked(new Date())
    })
  }

  useEffect(refresh, [])

  if (complaints === null) {
    return <p className="text-sakura-100/60">Loading…</p>
  }

  if (complaints.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sakura-100/60">No complaints yet.</p>
        <Link
          to="/report"
          className="mt-4 inline-block rounded-lg bg-sakura-500 px-4 py-2 text-sm font-medium hover:bg-sakura-600"
        >
          Report your first issue
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold">My Complaints</h1><p className="mt-1 text-sm text-sakura-100/55">Revisit your reports and follow the municipality's response.</p></div>
        <button onClick={refresh} className="rounded-lg border border-sakura-300/25 bg-white/5 px-3 py-2 text-sm text-sakura-100 hover:bg-white/10">Check municipality updates</button>
      </div>
      {lastChecked && <p className="-mt-2 text-xs text-sakura-100/40">Last checked {lastChecked.toLocaleTimeString()}</p>}
      {complaints.map((c) => (
        <div
          key={c.id}
          className="flex gap-4 rounded-xl border border-sakura-300/15 bg-plum-900/40 p-4"
        >
          {c.image_url && (
            <img
              src={c.image_url}
              alt=""
              className="h-20 w-20 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-sakura-300">{c.id}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  STATUS_STYLES[c.status] ?? 'bg-white/10 text-sakura-100/70'
                }`}
              >
                {c.status}
              </span>
              {c.ai?.severity && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    SEVERITY_STYLES[c.ai.severity] ?? 'bg-white/10 text-sakura-100/70'
                  }`}
                >
                  {c.ai.severity} · {c.priority?.score ?? c.ai.priority_score}
                </span>
              )}
              {c.duplicate_of && (
                <span className="text-xs text-sakura-100/40">
                  merged into <span className="font-mono">{c.duplicate_of}</span>
                </span>
              )}
              {c.report_count > 1 && (
                <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs text-sky-400">
                  {c.report_count} citizens reported
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-sm text-sakura-100/80">{c.description}</p>
            <p className="mt-1 text-xs text-sakura-100/40">
              {c.ai?.category ?? c.category} · {new Date(c.created_at).toLocaleString()}
              {c.location &&
                ` · ${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)}`}
              {c.ai?.department && ` · ${c.ai.department}`}
            </p>
            <ActionTracker complaint={c} />
            {c.status === 'Resolved' && (
              <VerifyBlock complaint={c} onDone={refresh} />
            )}
            {c.verification && (
              <p className="mt-2 text-xs text-emerald-400">
                You verified: {c.verification.result}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
