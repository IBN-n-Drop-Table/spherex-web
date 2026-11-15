// Nearest catalogued star with a parallax, from SIMBAD. The CDS host was unreachable, so this uses
// the Harvard mirror (it allows browser requests). It only describes what is catalogued next to
// the position: it does NOT say that this is the object the user is looking at.
const TAP = 'https://simbad.harvard.edu/simbad/sim-tap/sync'
export const NEAR_RADIUS_ARCSEC = 10
// After a failure (SIMBAD limits automated clients, or it is simply down) stay quiet for a while
// instead of hammering it: the nearby-star line is a nicety, not data anything depends on.
const COOLDOWN_MS = 5 * 60_000
let pausedUntil = 0
export const simbadPaused = () => Date.now() < pausedUntil
const MIN_PARALLAX_SNR = 3 // below this the distance is not worth showing
const UNCERTAIN_BELOW_SNR = 5 // between the two: say "roughly"

export interface NearbyStar {
  name: string
  distanceLy: number
  separationArcsec: number
  uncertain: boolean
}

const adql = (ra: number, dec: number) => `
SELECT TOP 1 main_id, plx_value, plx_err,
  DISTANCE(POINT('ICRS', ra, dec), POINT('ICRS', ${ra}, ${dec})) AS sep
FROM basic
WHERE CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', ${ra}, ${dec}, ${NEAR_RADIUS_ARCSEC / 3600})) = 1
  AND plx_value > 0 AND plx_err > 0
ORDER BY sep`

/** One ADQL query; any failure starts the pause. Returns the result rows. */
async function tap<Row>(query: string, signal?: AbortSignal): Promise<Row[]> {
  const url = new URL(TAP)
  url.search = new URLSearchParams({ request: 'doQuery', lang: 'adql', format: 'json', query }).toString()
  try {
    const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`SIMBAD answered ${res.status}`)
    return ((await res.json()) as { data?: Row[] }).data ?? []
  } catch (e) {
    if (!signal?.aborted) pausedUntil = Date.now() + COOLDOWN_MS // our own cancel is not SIMBAD's fault
    throw e
  }
}

/** `null` when nothing with a usable parallax lies within 10″ of the position. */
export async function nearestStar(ra: number, dec: number, signal?: AbortSignal): Promise<NearbyStar | null> {
  const row = (await tap<[string, number, number, number]>(adql(ra, dec), signal))[0]
  if (!row) return null
  const [name, plx, err, sep] = row
  const snr = plx / err
  if (!(snr >= MIN_PARALLAX_SNR)) return null
  return {
    name: name.replace(/^(\*|V\*|NAME)\s+/, '').trim(),
    distanceLy: (1000 / plx) * 3.26156, // parallax in mas -> parsecs -> light-years
    separationArcsec: sep * 3600,
    uncertain: snr < UNCERTAIN_BELOW_SNR,
  }
}

export function nearbyStarText(s: NearbyStar): string {
  const ly = s.distanceLy < 100 ? s.distanceLy.toFixed(1) : Math.round(s.distanceLy).toLocaleString('en-US')
  return `Nearest catalogued star (${Math.round(s.separationArcsec)}″ away): ${s.name}, ${s.uncertain ? 'roughly ' : ''}${ly} light-years.`
}

export const OBJECTS_RADIUS_ARCMIN = 2
export const OBJECTS_MAX = 10

/** A catalogue entry near a position (not a SPHEREx detection). */
export interface CatalogObject {
  name: string
  type: string | null
  separationArcsec: number
  /** Only when the parallax is solid (signal-to-noise of 5 or more). */
  distanceLy: number | null
}

// SIMBAD's short type labels, in plain words (the common ones; anything else is shown as SIMBAD writes it).
const TYPE_NAMES: Record<string, string> = {
  'Star': 'star',
  'Galaxy': 'galaxy',
  'AGN': 'active galaxy nucleus',
  'QSO': 'quasar',
  'YSO': 'young stellar object',
  'EclBin': 'eclipsing binary star',
  'SB*': 'spectroscopic binary star',
  '**': 'double star',
  'RRLyrae': 'RR Lyrae variable star',
  'delSctV*': 'delta Scuti variable star',
  'LongPeriodV*': 'long-period variable star',
  'V*': 'variable star',
  'Mira': 'Mira variable star',
  'Cepheid': 'Cepheid variable star',
  'PM*': 'high proper-motion star',
  'WD*': 'white dwarf',
  'brownD*': 'brown dwarf',
  'BrownD*': 'brown dwarf',
  'Planet': 'planet',
  'Em*': 'emission-line star',
  'Infrared': 'infrared source',
  'Radio': 'radio source',
  'smmRad': 'submillimetre source',
  'X': 'X-ray source',
  'UV': 'ultraviolet source',
  'HerbigHaroObj': 'Herbig-Haro object',
  'Region': 'sky region',
  'PN': 'planetary nebula',
  'Cl*': 'star cluster',
}
const typeName = (label: string | null) => {
  if (!label) return null
  const candidate = /[_ ]Candidate$/.test(label)
  const base = label.replace(/[_ ]Candidate$/, '')
  const name = TYPE_NAMES[base] ?? base
  return candidate ? `${name} (candidate)` : name
}

/** What SIMBAD catalogues within 2′ of the position, closest first (at most 10). */
export async function objectsNear(ra: number, dec: number, signal?: AbortSignal): Promise<CatalogObject[]> {
  const query = `
SELECT TOP ${OBJECTS_MAX} b.main_id, o.label, DISTANCE(POINT('ICRS', b.ra, b.dec), POINT('ICRS', ${ra}, ${dec})) AS sep, b.plx_value, b.plx_err
FROM basic AS b LEFT JOIN otypedef AS o ON o.otype = b.otype
WHERE CONTAINS(POINT('ICRS', b.ra, b.dec), CIRCLE('ICRS', ${ra}, ${dec}, ${OBJECTS_RADIUS_ARCMIN / 60})) = 1
ORDER BY sep`
  const rows = await tap<[string, string | null, number, number | null, number | null]>(query, signal)
  return rows.map(([name, type, sep, plx, err]) => ({
    name: name.replace(/^(\*|V\*|NAME)\s+/, '').replace(/\s{2,}/g, ' ').trim(),
    type: typeName(type),
    separationArcsec: sep * 3600,
    distanceLy: plx && err && plx > 0 && plx / err >= UNCERTAIN_BELOW_SNR ? (1000 / plx) * 3.26156 : null,
  }))
}

/** The Markdown the chat panel shows for a catalogue lookup. */
export function catalogAnswer(objects: CatalogObject[]): string {
  if (objects.length === 0) return `SIMBAD lists no objects within ${OBJECTS_RADIUS_ARCMIN}′ of the centre of this view.`
  const lines = objects.map((o, i) => {
    const ly = o.distanceLy == null ? '' : `, about ${o.distanceLy < 100 ? o.distanceLy.toFixed(1) : Math.round(o.distanceLy).toLocaleString('en-US')} light-years`
    return `${i + 1}. **${o.name}** – ${o.type ?? 'object'}, ${Math.round(o.separationArcsec)}″ from the centre${ly}`
  })
  const head = objects.length >= OBJECTS_MAX ? `The ${OBJECTS_MAX} closest catalogued objects` : 'Catalogued objects'
  return `${head} within ${OBJECTS_RADIUS_ARCMIN}′ of the centre of this view:\n\n${lines.join('\n')}`
}
