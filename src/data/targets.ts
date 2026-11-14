/**
 * The five objects the challenge asks us to test on. Positions are ICRS at J2000 (from SIMBAD,
 * which propagates every catalogue to J2000) plus proper motion, because these are FAST movers:
 * Barnard's Star shifts ~4.4 arcmin between J2000 and the SPHEREx survey, WISE 0855 ~3.5 arcmin.
 * `targetPosition()` moves them to the SPHEREx epoch so the map centres on where they are now.
 *
 * TODO: replace with the backend's `crval` per target (or a GET /targets endpoint) once available;
 * the backend centres its patches on the star's real position at epoch 1.
 */
export interface Target {
  id: string
  name: string
  note: string
  ra: number // degrees, J2000
  dec: number // degrees, J2000
  pmra: number // mas/yr, already multiplied by cos(dec)
  pmdec: number // mas/yr
}

/** Mid-point of the SPHEREx observations we use (2025). */
export const SPHEREX_EPOCH = 2025.5
/** Patch size the backend caches per target (arcmin). */
export const TARGET_FOV_ARCMIN = 5

export const TARGETS: readonly Target[] = [
  {
    id: 'barnard',
    name: "Barnard's Star",
    note: 'Red dwarf with the fastest proper motion known',
    ra: 269.4520769586187,
    dec: 4.693364966576667,
    pmra: -801.551,
    pmdec: 10362.394,
  },
  {
    id: 'epsilon-indi-b',
    name: 'Epsilon Indi B',
    note: 'Pair of brown dwarfs orbiting a star',
    ra: 331.04414658852124,
    dec: -56.782844195116105,
    pmra: 3981.977,
    pmdec: -2466.832,
  },
  {
    id: 'wise-0855',
    name: 'WISE 0855',
    note: 'Fast-moving brown dwarf',
    ra: 133.81890825,
    dec: -7.247048,
    pmra: -8123.7,
    pmdec: 673.2,
  },
  {
    id: 'rw-aurigae',
    name: 'RW Aurigae',
    note: 'Variable star (T Tauri)',
    ra: 76.95652603458333,
    dec: 30.401438173888888,
    pmra: 7.23,
    pmdec: -20.33,
  },
  {
    id: 'r-draconis',
    name: 'R Draconis',
    note: 'Variable star (Mira)',
    ra: 248.16761083295,
    dec: 66.75497941722,
    pmra: -20.643,
    pmdec: 6.149,
  },
]

/** Linear proper-motion propagation from J2000 to `epoch` (decimal year). */
export function targetPosition(t: Target, epoch = SPHEREX_EPOCH): { ra: number; dec: number } {
  const years = epoch - 2000
  const cosDec = Math.cos((t.dec * Math.PI) / 180)
  const ra = t.ra + (t.pmra / 3.6e6 / cosDec) * years // pmra already includes cos(dec)
  const dec = t.dec + (t.pmdec / 3.6e6) * years
  return { ra: (ra + 360) % 360, dec }
}
