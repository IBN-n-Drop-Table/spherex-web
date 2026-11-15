import { useState } from 'react'
import { fmt, parseDec, parseRa } from '../lib/coords'
import { Button } from './ui'
import { cx } from './classes'

export interface Coords {
  ra: number
  dec: number
  fov: number
}

interface Props {
  value: Coords
  loading?: boolean
  onSubmit: (c: Coords) => void
  /** `row`: one line for the top bar. `stack`: full labels, one field per line (phones). */
  layout?: 'row' | 'stack'
}

type Draft = { ra: string; dec: string; fov: string }

const RULES: Record<keyof Coords, (n: number) => boolean> = {
  ra: n => n >= 0 && n < 360,
  dec: n => n >= -90 && n <= 90,
  fov: n => n > 0,
}
const FIELDS: { key: keyof Coords; label: string; name: string; unit: string; help: string }[] = [
  { key: 'ra', label: 'RA', name: 'Right ascension', unit: '°', help: 'Right ascension, in degrees. Also accepts 08h55m10s.' },
  { key: 'dec', label: 'Dec', name: 'Declination', unit: '°', help: 'Declination, in degrees. Also accepts -7d14m42s.' },
  { key: 'fov', label: 'FOV', name: 'Field of view', unit: '′', help: 'Field of view: how much sky fits across, in arcminutes.' },
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
export default function CoordinatesPanel({ value, loading, onSubmit, layout = 'row' }: Props) {
  const [draft, setDraft] = useState<Draft>({
    ra: fmt(value.ra),
    dec: fmt(value.dec),
    fov: fmt(value.fov),
  })

  const valid = (k: keyof Coords) => RULES[k](parse(k, draft[k]))
  const allValid = FIELDS.every(f => valid(f.key))
  const stack = layout === 'stack'

  const submit = () => {
    if (!allValid) return
    onSubmit({ ra: parse('ra', draft.ra), dec: parse('dec', draft.dec), fov: parse('fov', draft.fov) })
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        submit()
      }}
      aria-label="Coordinates"
      className={cx('font-mono text-xs', stack ? 'grid gap-2' : 'flex items-center gap-3')}
    >
      {FIELDS.map(({ key, label, name, unit, help }) => (
        <label key={key} title={help} className={cx('flex items-center gap-1.5', stack && 'justify-between')}>
          <span className={cx('text-faint', stack && 'font-sans text-muted')}>{stack ? name : label}</span>
          <span className="flex items-center gap-1">
            <input
              inputMode="decimal"
              value={draft[key]}
              onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
              aria-label={name}
              aria-invalid={!valid(key)}
              className={cx(
                'rounded-ctl border bg-sunken px-2 text-paper',
                stack ? 'h-11 w-40' : 'h-8 w-[6.75rem]',
                key === 'fov' && !stack && 'w-[4.5rem]',
                valid(key) ? 'border-rule-strong focus:border-accent' : 'border-danger',
              )}
            />
            <span className="w-2 text-faint">{unit}</span>
          </span>
        </label>
      ))}
      <Button type="submit" size="sm" variant={stack ? 'primary' : 'secondary'} disabled={!allValid || loading} className="font-sans">
        {loading ? 'Loading…' : 'Go'}
      </Button>
    </form>
  )
}
