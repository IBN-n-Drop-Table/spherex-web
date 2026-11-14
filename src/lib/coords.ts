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
