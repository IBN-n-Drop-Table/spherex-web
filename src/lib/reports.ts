import { ApiError } from '../api/http'
import type { Classification } from '../types/api'

export const CLASSIFICATIONS: { value: Classification; label: string; color: string }[] = [
  { value: 'asteroid', label: 'Asteroid', color: '#94a3b8' },
  { value: 'brown_dwarf', label: 'Brown dwarf', color: '#f97316' },
  { value: 'high_proper_motion_star', label: 'High proper-motion star', color: '#38bdf8' },
  { value: 'variable_star', label: 'Variable star', color: '#facc15' },
  { value: 'transient_anomaly', label: 'Transient / anomaly', color: '#f472b6' },
  { value: 'other', label: 'Other', color: '#a1a1aa' },
]
export const classificationInfo = (c: Classification) =>
  CLASSIFICATIONS.find(x => x.value === c) ?? CLASSIFICATIONS[CLASSIFICATIONS.length - 1]

export const HANDLE_MAX = 50
export const NOTES_MAX = 1000

/** "5 min ago" style label; falls back to the date for old reports. */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60_000)
  if (!Number.isFinite(minutes)) return ''
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days < 30 ? `${days} d ago` : new Date(iso).toLocaleDateString()
}

/**
 * One sentence for a failed report request. The backend's `detail` is already readable (a 422 names
 * the field: "discoverer: String should have at most 50 characters"), so it is shown as is.
 */
export function describeReportError(e: unknown): string {
  if (e instanceof ApiError) {
    const { status, detail } = e.problem
    if (status === 422) return detail ?? 'The backend rejected the report.'
    if (status === 404) return 'That report no longer exists.'
    if (status >= 500) return 'The server had a problem. Try again in a moment.'
    return detail ?? 'The server rejected the request.'
  }
  return 'Could not reach the server.'
}

// Per-browser conveniences (name to prefill, reports already confirmed). Never required: storage
// can be empty or blocked, so every access is guarded.
const HANDLE_KEY = 'spherex:handle'
const VERIFIED_KEY = 'spherex:verified'

export function loadHandle(): string {
  try {
    return localStorage.getItem(HANDLE_KEY) ?? ''
  } catch {
    return ''
  }
}
export function saveHandle(handle: string) {
  try {
    localStorage.setItem(HANDLE_KEY, handle)
  } catch {
    /* storage unavailable: the name just isn't remembered */
  }
}
export function loadVerified(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(VERIFIED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}
export function saveVerified(ids: Set<string>) {
  try {
    localStorage.setItem(VERIFIED_KEY, JSON.stringify([...ids]))
  } catch {
    /* storage unavailable */
  }
}

/** Link that reopens the sky map centred on a report (the app keeps its state in the URL). */
export function reportLink(report: { ra_deg: number; dec_deg: number }, loc: Location = window.location): string {
  const n = (v: number) => String(Number(v.toFixed(6)))
  return `${loc.origin}${loc.pathname}?ra=${n(report.ra_deg)}&dec=${n(report.dec_deg)}&fov=5`
}
