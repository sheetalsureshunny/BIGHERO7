import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyComplaints, verifyComplaint } from '../lib/api.js'
import { SEVERITY_STYLES, STATUS_STYLES } from '../components/severity.js'

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

  function refresh() {
    getMyComplaints().then(setComplaints)
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
      <h1 className="text-2xl font-bold">My Complaints</h1>
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
