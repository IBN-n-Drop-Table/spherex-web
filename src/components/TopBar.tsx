import { useState } from 'react'
import { fmt } from '../lib/coords'
import { useMediaQuery } from '../hooks/useMediaQuery'
import CoordinatesPanel, { type Coords } from './CoordinatesPanel'
import { Button, Segmented } from './ui'
import { ChevronDownIcon, ChevronUpIcon } from './icons'
import Logo from './Logo'

type View = 'sky' | 'data'

interface Props {
  view: View
  onView: (v: View) => void
  coords: Coords
  onCoords: (c: Coords) => void
  /** Back to the landing page. */
  onHome: () => void
  onCredits: () => void
}

/**
 * The chrome both views share: the name (a way back to the landing page), the Sky map /
 * SPHEREx data switch, the coordinates search and the credits, always in the same place.
 */
export default function TopBar({ view, onView, coords, onCoords, onHome, onCredits }: Props) {
  const roomy = useMediaQuery('(min-width: 1180px)') // the search fits in the bar itself
  const wide = useMediaQuery('(min-width: 768px)') // else a second row, or a fold-out on phones
  const [editing, setEditing] = useState(false)
  const formKey = `${coords.ra}|${coords.dec}|${coords.fov}`
  const submit = (c: Coords) => {
    setEditing(false)
    onCoords(c)
  }

  return (
    <header className="relative z-30 shrink-0 border-b border-rule bg-surface">
      <div className="flex h-12 items-center gap-2 px-3 md:gap-4 md:px-4">
        <button
          onClick={onHome}
          title="About this project"
          className="flex min-h-11 items-center gap-2 whitespace-nowrap font-display text-lg leading-none text-paper hover:text-accent md:min-h-0"
        >
          <Logo />
          <span className="flex items-baseline gap-1.5 leading-none">
            <span className="text-2xl tracking-tight">Eskai</span>
            <span className="hidden whitespace-nowrap text-base italic text-muted xl:inline">look up</span>
          </span>
        </button>
        <Segmented
          label="View"
          value={view}
          onChange={onView}
          options={[
            { id: 'sky', label: 'Sky map', title: 'The whole sky: find a place to look at' },
            { id: 'data', label: 'SPHEREx data', title: 'What SPHEREx saw at these coordinates, visit by visit' },
          ]}
        />
        <div className="ml-auto flex items-center gap-3">
          {roomy && <CoordinatesPanel key={formKey} value={coords} onSubmit={submit} />}
          <Button variant="quiet" size="sm" onClick={onCredits} title="Data used and who to thank">
            Credits
          </Button>
        </div>
      </div>

      {!roomy && wide && (
        <div className="flex justify-end border-t border-rule px-4 py-1.5">
          <CoordinatesPanel key={formKey} value={coords} onSubmit={submit} />
        </div>
      )}
      {!wide && (
        <div className="border-t border-rule">
          <button
            onClick={() => setEditing(e => !e)}
            aria-expanded={editing}
            className="flex min-h-11 w-full items-center justify-between gap-2 px-3 font-mono text-xs text-muted"
          >
            <span>
              RA {fmt(coords.ra)}° · Dec {fmt(coords.dec)}° · {fmt(coords.fov)}′
            </span>
            <span className="flex items-center gap-1 font-sans text-accent">
              {editing ? 'Close' : 'Edit'} {editing ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
            </span>
          </button>
          {editing && (
            <div className="absolute inset-x-0 top-full border-b border-rule-strong bg-surface p-3 shadow-dialog">
              <CoordinatesPanel key={formKey} value={coords} onSubmit={submit} layout="stack" />
            </div>
          )}
        </div>
      )}
    </header>
  )
}
