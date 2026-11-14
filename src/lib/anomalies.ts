import type { Anomaly } from '../types/api'

/** Marker colour: unverified/contaminated first, then brighter (appeared) vs fainter (disappeared). */
export function anomalyColorClass(a: Anomaly): string {
  if (!a.is_clean_detection) return 'stroke-amber-400'
  return a.kind === 'disappeared' ? 'stroke-rose-400' : 'stroke-emerald-400'
}
