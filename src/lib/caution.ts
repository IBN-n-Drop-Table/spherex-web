import type { ResponseQuality } from '../types/api'

const QUALITY_LABEL: Record<ResponseQuality, string> = {
  unvalidated: 'Unvalidated data: do not read it as a detection.',
  low: 'Lower limit only: the core of this object saturates SPHEREx.',
}

interface Cautious {
  science_note?: string | null
  quality?: ResponseQuality | null
  saturated?: boolean | null
}

/**
 * The scientific caveats the backend attaches to a response. `full` adds the long `science_note`
 * (shown once, near the image); the short lines go next to each chart.
 */
export function cautionLines(d: Cautious | null | undefined, opts: { full?: boolean } = {}): string[] {
  if (!d) return []
  const lines: string[] = []
  if (d.quality) lines.push(QUALITY_LABEL[d.quality])
  else if (d.saturated) lines.push('Saturated core: brightness values are not reliable.')
  if (opts.full && d.science_note) lines.push(d.science_note)
  return lines
}
