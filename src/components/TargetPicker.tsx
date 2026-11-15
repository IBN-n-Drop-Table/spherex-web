import { TARGETS, type Target } from '../data/targets'
import { useTargetFacts } from '../hooks/useTargetFacts'
import { distanceText, findTarget, lightStory } from '../lib/story'
import { ArrowRightIcon } from './icons'

interface Props {
  onSelect: (target: Target) => void
}

/** The five points of interest, as an index: picking one moves the map to it. */
export default function TargetPicker({ onSelect }: Props) {
  const facts = useTargetFacts()
  return (
    <ul aria-label="Points of interest" className="divide-y divide-rule">
      {TARGETS.map(t => {
        const f = findTarget(facts, t.name)
        const distance = distanceText(f)
        return (
          <li key={t.id}>
            <button onClick={() => onSelect(t)} className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-raised">
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-lg leading-6 text-paper">{t.name}</span>
                  {distance && <span className="shrink-0 font-mono text-2xs text-faint">{distance}</span>}
                </span>
                <span className="block text-xs text-muted">{t.note}</span>
                {lightStory(f) && <span className="mt-1 block font-display text-sm italic leading-snug text-muted">{lightStory(f)}</span>}
              </span>
              <ArrowRightIcon className="mt-1 h-4 w-4 shrink-0 text-faint transition-colors group-hover:text-accent" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
