import type { TargetSummary } from '../types/api'

const years = (n: number) => `${n.toLocaleString('en-US')} ${n === 1 ? 'year' : 'years'}`

/**
 * "The light you see left this object about 6 years ago". Built here from the numbers (not from
 * the backend's own sentence, which is not in English yet). Uncertain distances say "roughly".
 */
export function lightStory(t: TargetSummary | undefined): string | null {
  if (t?.light_left_years_ago == null) return null
  return t.distance_uncertain
    ? `The light you see left this object roughly ${years(t.light_left_years_ago)} ago (its distance is uncertain).`
    : `The light you see left this object about ${years(t.light_left_years_ago)} ago.`
}

/** "6.0 light-years" / "roughly 2,600 light-years". */
export function distanceText(t: TargetSummary | undefined): string | null {
  if (t?.distance_ly == null) return null
  const ly = t.distance_ly
  const n = ly < 100 ? ly.toFixed(1) : Math.round(ly).toLocaleString('en-US')
  return `${t.distance_uncertain ? 'roughly ' : ''}${n} light-years`
}

const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
export const findTarget = (list: TargetSummary[], name: string | null | undefined) =>
  name ? list.find(t => key(t.name) === key(name)) : undefined
