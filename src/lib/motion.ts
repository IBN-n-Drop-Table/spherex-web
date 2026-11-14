import { TARGETS, type Target } from '../data/targets'
import { skyToPixel } from './wcs'
import type { Patch } from '../types/api'

const YEAR_MS = 365.25 * 86_400_000

/** One of the five challenge targets, whose proper motion we know (matched by the name the API sends). */
export function knownTarget(name: string): Target | undefined {
  const n = name.trim().toLowerCase()
  return TARGETS.find(t => t.name.toLowerCase() === n)
}

/**
 * Where the target should be in the patch image at `atMs`, from its catalogue proper motion.
 * The patch is centred on the target at the EPOCH-1 date (that is what the backend's `crval` is),
 * so the position at another date is that centre plus proper motion x elapsed time.
 * Pixels: x grows to the WEST (right), y grows to the SOUTH (down). Expected, not measured.
 */
export function expectedPixel(target: Target, patch: Patch, epoch1Ms: number, atMs: number): { x: number; y: number } | null {
  const { wcs } = patch
  const centre = skyToPixel(patch, wcs.crval1, wcs.crval2)
  if (!centre) return null
  const years = (atMs - epoch1Ms) / YEAR_MS
  const arcsecPerPxX = Math.hypot(wcs.cd1_1, wcs.cd2_1) * 3600
  const arcsecPerPxY = Math.hypot(wcs.cd1_2, wcs.cd2_2) * 3600
  const x = centre.x - (target.pmra / 1000) * years / arcsecPerPxX // pmra already includes cos(dec); east is left
  const y = centre.y - (target.pmdec / 1000) * years / arcsecPerPxY // north is up
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
}
