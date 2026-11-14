/**
 * Angle parsing for RA/Dec inputs and URL params.
 * Accepts decimal degrees ("133.795"), sexagesimal with units ("08h55m10s", "-7d14m42s")
 * or with colons/spaces ("08:55:10", "-7 14 42"). Returns NaN when it cannot parse.
 * Sexagesimal RA is read as hours (x15) unless marked with d/°; Dec is always degrees.
 */
function parseAngle(input: string, sexagesimalIsHours: boolean): number {
  const raw = input.trim().toLowerCase()
  if (!raw) return NaN
  const hasH = raw.includes('h')
  const hasDeg = /[d°]/.test(raw)
  const cleaned = raw.replace(/[hdms°'′"″:]/g, ' ').trim()
  if (!/^[+-]?[\d.]+(\s+[\d.]+){0,2}$/.test(cleaned)) return NaN
  const negative = cleaned.startsWith('-')
  const parts = cleaned.replace(/^[+-]/, '').split(/\s+/).map(Number)
  if (parts.some(Number.isNaN)) return NaN
  const [a, b = 0, c = 0] = parts
  const value = a + b / 60 + c / 3600
  const isHours = hasH || (sexagesimalIsHours && parts.length > 1 && !hasDeg)
  return (isHours ? value * 15 : value) * (negative ? -1 : 1)
}

export const parseRa = (s: string) => parseAngle(s, true)
export const parseDec = (s: string) => parseAngle(s, false)

/** Compact decimal for URLs / inputs (max 6 decimals, no trailing zeros). */
export const fmt = (n: number) => String(Number(n.toFixed(6)))

/** Right ascension as `08h 55m 10.83s`. */
export function formatRa(deg: number): string {
  // 15 deg/h, 3600 s/h. Wrap AFTER rounding: 359.99999 deg rounds up to a full 24 h day.
  const totalSeconds = (Math.round((((deg % 360) + 360) % 360) * 240 * 100) / 100) % 86400
  const h = Math.floor(totalSeconds / 3600) % 24
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds - h * 3600 - m * 60
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${s.toFixed(2).padStart(5, '0')}s`
}

/** Declination as `−07° 14′ 42.5″`. */
export function formatDec(deg: number): string {
  const sign = deg < 0 ? '−' : '+'
  const totalSeconds = Math.round(Math.abs(deg) * 3600 * 10) / 10
  const d = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds - d * 3600 - m * 60
  return `${sign}${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}′ ${s.toFixed(1).padStart(4, '0')}″`
}
