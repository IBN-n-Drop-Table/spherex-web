import type { ReactNode } from 'react'
import { Dialog, Kbd } from './ui'

type Row = [keys: ReactNode[], what: string]

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'Anywhere',
    rows: [
      [['?'], 'Show this list'],
      [['/'], 'Jump to the coordinates'],
      [['Esc'], 'Close the open panel or window'],
    ],
  },
  {
    title: 'SPHEREx data: the player',
    rows: [
      [['←', '→'], 'Previous / next frame'],
      [['Space'], 'Play or pause'],
      [['Home', 'End'], 'First / last frame'],
      [['−', '+'], 'Slower / faster'],
      [['1', '…', '6'], 'Layers, in the order shown (Infrared, H₂O, CO₂, CO, Difference, Detections)'],
      [['I'], 'Details of the Difference or Detections layer'],
    ],
  },
  {
    title: 'SPHEREx data: panels and the sky around',
    rows: [
      [['S'], 'Spectrum'],
      [['L'], 'Light curve'],
      [['A'], 'Ask about it'],
      [['C'], 'Sightings here'],
      [['O'], 'Show or hide the sky around the picture'],
      [['H'], 'Show or hide the SPHEREx picture over it'],
      [['R'], 'Reset the view of the sky around'],
    ],
  },
  {
    title: 'Sky map',
    rows: [
      [['P'], 'Points of interest'],
      [['U'], 'Point at the sky (what is above you)'],
      [['C'], 'Eye vs infrared'],
      [['G'], 'Find what moves (the game)'],
      [['S'], 'Sightings'],
      [['D'], 'See SPHEREx data for the spot in the middle'],
    ],
  },
]

/** The list of keyboard shortcuts (opened with `?`). */
export default function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Keyboard shortcuts" onClose={onClose} width="max-w-2xl">
      <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
        {GROUPS.map(g => (
          <section key={g.title}>
            <h3 className="label-caps mb-2 text-faint">{g.title}</h3>
            <dl className="divide-y divide-rule border-y border-rule">
              {g.rows.map(([keys, what]) => (
                <div key={what} className="flex items-center justify-between gap-4 py-1.5">
                  <dt className="text-xs text-muted">{what}</dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {keys.map((k, i) => (k === '…' ? <span key={i} className="text-faint">…</span> : <Kbd key={i}>{k}</Kbd>))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p className="mt-5 text-2xs text-faint">Shortcuts pause while you type in a field, and while a window like this one is open.</p>
    </Dialog>
  )
}
