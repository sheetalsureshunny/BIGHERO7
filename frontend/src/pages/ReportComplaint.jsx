import { useState } from 'react'
import { Link } from 'react-router-dom'
import LocationPicker from '../components/LocationPicker.jsx'
import { submitComplaint } from '../lib/api.js'

const CATEGORIES = [
  'Auto-detect (AI)',
  'Garbage / Waste',
  'Pothole / Road Damage',
  'Broken Streetlight',
  'Water Leakage',
  'Traffic Problem',
  'Public Safety',
  'Other',
]

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const SEVERITY_STYLES = {
  Low: 'bg-emerald-500/20 text-emerald-400',
  Medium: 'bg-yellow-500/20 text-yellow-400',
  High: 'bg-orange-500/20 text-orange-400',
  Critical: 'bg-red-500/20 text-red-400',
}

export default function ReportComplaint() {
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [location, setLocation] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageError, setImageError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [ticket, setTicket] = useState(null)

  function onImageChange(e) {
    const file = e.target.files?.[0]
    setImageError(null)
    setImageFile(null)
    setImagePreview(null)
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image too large — max 5 MB.')
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const complaint = await submitComplaint({
        description,
        category,
        location,
        imageFile,
      })
      setTicket(complaint)
    } catch (err) {
      setSubmitError(
        err.response?.data?.detail?.toString() ??
          'Submit failed — is the backend running on :8000?',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (ticket) {
    const ai = ticket.ai
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <h2 className="text-2xl font-bold">Complaint Submitted</h2>
        <p className="mt-2 text-sakura-100/80">Your ticket ID</p>
        <p className="mt-1 font-mono text-3xl font-bold text-emerald-400">
          {ticket.id}
        </p>
        <p className="mt-2 text-sm text-sakura-100/60">+5 Civic Points earned.</p>
        {ai && (
          <div className="mt-6 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-violet-300">
                Analysis
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[ai.severity] ?? 'bg-white/10 text-sakura-100/70'}`}
              >
                {ai.severity}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-sakura-100/40">Category</p>
                <p className="text-sakura-50">{ai.category}</p>
              </div>
              <div>
                <p className="text-xs text-sakura-100/40">Department</p>
                <p className="text-sakura-50">{ai.department}</p>
              </div>
              <div>
                <p className="text-xs text-sakura-100/40">Priority score</p>
                <p className="font-mono text-lg font-bold text-violet-300">
                  {ai.priority_score}/100
                </p>
              </div>
              <div>
                <p className="text-xs text-sakura-100/40">Est. resolution</p>
                <p className="text-sakura-50">{ai.estimated_resolution_time}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-sakura-100/60">
              <span className="font-semibold text-sakura-100/80">Action: </span>
              {ai.recommended_action}
            </p>
            {ai.ai_mode === 'fallback' && (
              <p className="mt-2 text-xs text-amber-400/70">
                Offline analysis (no OpenAI key configured)
              </p>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/my-complaints"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/10"
          >
            View my complaints
          </Link>
          <button
            onClick={() => {
              setTicket(null)
              setDescription('')
              setCategory(CATEGORIES[0])
              setLocation(null)
              setImageFile(null)
              setImagePreview(null)
            }}
            className="rounded-lg bg-sakura-500 px-4 py-2 text-sm font-medium hover:bg-sakura-600"
          >
            Report another
          </button>
        </div>
      </div>
    )
  }

  const canSubmit = description.trim().length >= 10 && location && !submitting

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Report a Civic Issue</h1>
        <p className="mt-1 text-sm text-sakura-100/60">
          Describe the problem, pin the location, add a photo. AI handles the rest.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-sakura-100/80">
          What's the problem? <span className="text-sakura-300">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="e.g. Large garbage pile near Aluva Metro Station entrance, blocking the footpath…"
          className="w-full rounded-xl border border-sakura-300/15 bg-plum-950/50 p-3 text-sm placeholder:text-sakura-100/30 focus:border-sakura-400 focus:outline-none"
        />
        <p className="mt-1 text-xs text-sakura-100/40">
          {description.trim().length < 10
            ? 'At least 10 characters.'
            : `${description.trim().length} characters`}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-sakura-100/80">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-sakura-300/15 bg-plum-950/50 p-3 text-sm focus:border-sakura-400 focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-sakura-100/80">
          Photo (optional)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={onImageChange}
          className="block w-full text-sm text-sakura-100/60 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-sakura-50 hover:file:bg-white/10"
        />
        {imageError && <p className="mt-1 text-sm text-amber-400">{imageError}</p>}
        {imagePreview && (
          <img
            src={imagePreview}
            alt="preview"
            className="mt-3 max-h-48 rounded-xl border border-sakura-300/15"
          />
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-sakura-100/80">
          Location <span className="text-sakura-300">*</span>
        </label>
        <LocationPicker value={location} onChange={setLocation} />
      </div>

      {submitError && (
        <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-sakura-500 py-3 font-semibold hover:bg-sakura-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? 'Submitting…' : 'Submit Complaint'}
      </button>
    </form>
  )
}
