// Shared status/severity styling — chips always pair color with emoji/text.
export const PRIORITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
}

export const PRIORITY_CHIP = {
  CRITICAL: 'bg-red-500/20 text-red-400',
  HIGH: 'bg-orange-500/20 text-orange-400',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400',
  LOW: 'bg-emerald-500/20 text-emerald-400',
}

export const SEVERITY_STYLES = {
  Low: 'bg-emerald-500/20 text-emerald-400',
  Medium: 'bg-yellow-500/20 text-yellow-400',
  High: 'bg-orange-500/20 text-orange-400',
  Critical: 'bg-red-500/20 text-red-400',
}

export const STATUS_STYLES = {
  Submitted: 'bg-sky-500/20 text-sky-400',
  'AI Verified': 'bg-violet-500/20 text-violet-400',
  Assigned: 'bg-amber-500/20 text-amber-400',
  'Work Started': 'bg-orange-500/20 text-orange-400',
  Resolved: 'bg-emerald-500/20 text-emerald-400',
  'Citizen Verified': 'bg-green-500/20 text-green-300',
  Merged: 'bg-white/10 text-sakura-100/70',
}

export const RESOLVED_STATUSES = ['Resolved', 'Citizen Verified']
