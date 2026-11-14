import { LAYER_BASE, LAYER_DIFF } from '../lib/layers'

interface Props {
  filters: string[] // chemical filter names
  layer: string // LAYER_BASE | LAYER_DIFF | filter name
  onChange: (layer: string) => void
  /** No data yet: show the same buttons, inert. */
  disabled?: boolean
  /** Filters the current epoch has no image for (no exposure covers that molecule's window). */
  unavailable?: string[]
}

const label = (l: string) => (l === LAYER_BASE ? 'Infrared' : l === LAYER_DIFF ? 'Difference' : l)

export default function LayerSwitcher({ filters, layer, onChange, disabled = false, unavailable = [] }: Props) {
  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-2 rounded bg-black/70 p-2 backdrop-blur">
      {[LAYER_BASE, ...filters, LAYER_DIFF].map(l => (
        <button
          key={l}
          onClick={() => onChange(l)}
          disabled={disabled || unavailable.includes(l)}
          title={unavailable.includes(l) ? 'No exposure of this epoch covers this molecule' : undefined}
          className={`rounded px-3 py-1 text-sm disabled:opacity-40 ${
            layer === l ? 'bg-sky-600' : 'bg-slate-800 hover:bg-slate-700'
          }`}
        >
          {label(l)}
        </button>
      ))}
    </div>
  )
}
