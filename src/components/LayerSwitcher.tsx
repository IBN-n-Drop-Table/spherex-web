import type { ReactNode } from 'react'
import { LAYER_BASE, LAYER_DETECT, LAYER_DIFF } from '../lib/layers'
import { cx } from './classes'

interface Props {
  filters: string[] // chemical filter names
  layer: string // LAYER_BASE | LAYER_DIFF | LAYER_DETECT | filter name
  onChange: (layer: string) => void
  /** No data yet: show the same buttons, inert. */
  disabled?: boolean
  /** Filters the current epoch has no image for (no exposure covers that molecule's window). */
  unavailable?: string[]
  /** How to write a filter's name (molecule subscripts). */
  name?: (layer: string) => ReactNode
}

const HINT: Record<string, string> = {
  [LAYER_BASE]: 'All the infrared light of a visit, in false colour',
  [LAYER_DIFF]: 'What changed between consecutive visits: press play to step through them',
  [LAYER_DETECT]: 'Candidates found by software on the first-vs-last difference (needs human verification)',
}

/**
 * The layer strip above the picture, in two groups: ways to see the light of one visit, and ways
 * to see what changed between visits.
 */
export default function LayerSwitcher({ filters, layer, onChange, disabled = false, unavailable = [], name = l => l }: Props) {
  const label = (l: string) => (l === LAYER_BASE ? 'Infrared' : l === LAYER_DIFF ? 'Difference' : l === LAYER_DETECT ? 'Detections (beta)' : name(l))
  const group = (title: string, layers: string[]) => (
    <div className="flex items-center gap-2">
      <span className="label-caps hidden whitespace-nowrap text-faint lg:inline">{title}</span>
      <div role="group" aria-label={title} className="inline-flex rounded-ctl border border-rule-strong">
        {layers.map((l, i) => (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            disabled={disabled || unavailable.includes(l)}
            aria-pressed={layer === l}
            title={unavailable.includes(l) ? 'No exposure of this visit covers this molecule' : (HINT[l] ?? 'Only the light at the wavelengths where this molecule leaves its mark')}
            className={cx(
              'min-h-11 whitespace-nowrap px-3 text-sm transition-colors duration-150 disabled:opacity-40 md:min-h-8',
              i > 0 && 'border-l border-rule-strong',
              layer === l ? 'bg-accent-wash text-accent' : 'text-muted hover:bg-raised hover:text-paper',
            )}
          >
            {label(l)}
          </button>
        ))}
      </div>
    </div>
  )
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-rule bg-surface px-3 py-1.5">
      {group('One visit', [LAYER_BASE, ...filters])}
      {group('Between visits', [LAYER_DIFF, LAYER_DETECT])}
    </div>
  )
}
