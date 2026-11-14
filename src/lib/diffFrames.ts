import type { DifferenceImaging } from '../types/api'

/** One frame of the Difference layer: the image of (epochA - epochB), epochB being the earlier visit. */
export interface DiffFrame {
  epochA: string // later visit (red = brighter here)
  epochB: string // earlier visit (blue = brighter here)
  imageUrl: string
  consecutive: boolean // false: first vs last visit
  deltaDays: number | null
  expectedShiftArcsec: number | null
  weak: boolean // expected motion below one SPHEREx pixel: any dipole will be faint
  label: string // "M0 → M6"
}

export const shortEpoch = (id: string) => id.replace(/^\d{4}_/, '') // 2025_M6 -> M6

/** The first-vs-last difference: the image the anomaly detector ran on. */
export function totalFrame(diff: DifferenceImaging): DiffFrame {
  return {
    epochA: diff.epoch_a,
    epochB: diff.epoch_b,
    imageUrl: diff.subtracted_image_url,
    consecutive: false,
    deltaDays: diff.delta_t_days ?? null,
    expectedShiftArcsec: diff.expected_shift_arcsec ?? null,
    weak: diff.weak_signal ?? false,
    label: `${shortEpoch(diff.epoch_b)} → ${shortEpoch(diff.epoch_a)}`,
  }
}

/**
 * The frames the Difference layer plays: one per pair of CONSECUTIVE visits, in time order (3 visits
 * give 2 frames). With fewer than 3 visits the backend sends no pairs and the only difference is
 * first-vs-last, so that single frame is used.
 */
export function buildDiffFrames(diff: DifferenceImaging): DiffFrame[] {
  const pairs = diff.pairwise ?? []
  if (pairs.length === 0) return [totalFrame(diff)]
  return pairs.map(p => ({
    epochA: p.epoch_a,
    epochB: p.epoch_b,
    imageUrl: p.subtracted_image_url,
    consecutive: true,
    deltaDays: p.delta_t_days,
    expectedShiftArcsec: p.expected_shift_arcsec ?? null,
    weak: p.weak_signal,
    label: `${shortEpoch(p.epoch_b)} → ${shortEpoch(p.epoch_a)}`,
  }))
}
