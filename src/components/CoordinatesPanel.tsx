import { useState } from 'react'
import { fmt, parseDec, parseRa } from '../lib/coords'

export interface Coords {
  ra: number
  dec: number
  fov: number
}

interface Props {
  value: Coords
  loading?: boolean
  onSubmit: (c: Coords) => void
}

type Draft = { ra: string; dec: string; fov: string }

const RULES: Record<keyof Coords, (n: number) => boolean> = {
  ra: n => n >= 0 && n < 360,
  dec: n => n >= -90 && n <= 90,
  fov: n => n > 0,
}
const FIELDS: { key: keyof Coords; label: string; unit: string }[] = [
  { key: 'ra', label: 'RA', unit: '°' },
  { key: 'dec', label: 'Dec', unit: '°' },
  { key: 'fov', label: 'FOV', unit: '′' },
]

const PARSERS: Record<keyof Coords, (s: string) => number> = {
  ra: parseRa, // also accepts 08h55m10s / 08:55:10
  dec: parseDec, // also accepts -7d14m42s / -7:14:42
  fov: s => (s.trim() === '' ? NaN : Number(s)),
}
const parse = (k: keyof Coords, s: string) => PARSERS[k](s)

/**
 * Editable RA / Dec / FOV. Drafts are local; the query only changes on Enter / Go.
 * Mount it with a `key` derived from `value` so drafts reset when the query changes elsewhere.
 */
export default function CoordinatesPanel({ value, loading, onSubmit }: Props) {
  const [draft, setDraft] = useState<Draft>({
    ra: fmt(value.ra),
    dec: fmt(value.dec),
    fov: fmt(value.fov),
  })

  const valid = (k: keyof Coords) => RULES[k](parse(k, draft[k]))
  const allValid = FIELDS.every(f => valid(f.key))

  const submit = () => {
    if (!allValid) return
    onSubmit({ ra: parse('ra', draft.ra), dec: parse('dec', draft.dec), fov: parse('fov', draft.fov) })
  }

  return (
    <form
      onSubmit={e => { e.preventDefault(); submit() }}
      className="absolute left-3 top-3 z-10 space-y-1 rounded bg-black/70 p-3 font-mono text-xs text-slate-100 backdrop-blur"
    >
      {FIELDS.map(({ key, label, unit }) => (
        <label key={key} className="flex items-center gap-2">
          <span className="w-8 text-slate-400">{label}</span>
          <input
            inputMode="decimal"
            value={draft[key]}
            onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
            aria-invalid={!valid(key)}
            className={`w-28 rounded bg-slate-900 px-2 py-1 outline-none ring-1 ${
              valid(key) ? 'ring-slate-700 focus:ring-sky-500' : 'ring-red-500'
            }`}
          />
          <span className="text-slate-400">{unit}</span>
        </label>
      ))}
      <button
        type="submit"
        disabled={!allValid || loading}
        className="mt-1 w-full rounded bg-sky-600 py-1 hover:bg-sky-500 disabled:opacity-40"
      >
        {loading ? 'Loading…' : 'Go'}
      </button>
    </form>
  )
}
