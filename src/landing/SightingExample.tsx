import { classificationInfo } from '../lib/reports'
import { CheckIcon } from '../components/icons'

// An EXAMPLE (clearly labelled), built from the same fields a real report has. Nothing here is a
// real person's report or a real finding.
const KIND = classificationInfo('brown_dwarf')
const EXAMPLE = {
  handle: 'a_volunteer',
  target: 'Epsilon Indi B',
  ra: '22h 04m 18.4s',
  dec: '-56° 46′ 57″',
  note: 'A pair that shifts between the two visits: red, then blue.',
  confirmations: 3,
}

/** The shareable sighting card, drawn in HTML at the size of its container (container query units). */
function CardPreview() {
  const cq = (n: number) => `${n}cqw`
  return (
    <div className="[container-type:inline-size]">
      <div className="relative aspect-[1200/630] overflow-hidden border border-rule-strong bg-ink">
        {/* cutout of the sighting, with the ring drawn round it */}
        <div className="absolute overflow-hidden border border-rule-strong bg-sunken" style={{ left: '5%', top: '14%', width: '37.5%', aspectRatio: '1' }}>
          <img src="/landing/epsilon-1.png" alt="" loading="lazy" className="h-full w-full [image-rendering:pixelated]" />
          <span className="absolute rounded-full border-2" style={{ borderColor: KIND.color, left: '38%', top: '36%', width: '26%', height: '26%' }} />
        </div>
        <div className="absolute" style={{ left: '46.7%', top: '14%', right: '5%' }}>
          <p className="font-sans font-medium uppercase text-accent" style={{ fontSize: cq(1.35), letterSpacing: '0.18em' }}>
            Citizen sighting
          </p>
          <p className="mt-[3%] flex items-center gap-[2%] font-display text-paper" style={{ fontSize: cq(4.3), lineHeight: 1.1 }}>
            <span className="inline-block shrink-0 rounded-full" style={{ background: KIND.color, width: cq(1.7), height: cq(1.7) }} />
            {KIND.label}
          </p>
          <p className="mt-[1%] text-muted" style={{ fontSize: cq(2.1) }}>
            {EXAMPLE.target}
          </p>
          <p className="mt-[4%] font-mono text-paper" style={{ fontSize: cq(2), lineHeight: 1.6 }}>
            RA&nbsp;&nbsp; {EXAMPLE.ra}
            <br />
            Dec {EXAMPLE.dec}
          </p>
          <p className="mt-[4%] font-display italic text-paper" style={{ fontSize: cq(1.8), lineHeight: 1.35 }}>
            “{EXAMPLE.note}”
          </p>
          <p className="mt-[5%] text-paper" style={{ fontSize: cq(1.9) }}>
            Reported by {EXAMPLE.handle}
          </p>
          <p className="text-muted" style={{ fontSize: cq(1.5) }}>
            confirmed by {EXAMPLE.confirmations}
          </p>
        </div>
        <div className="absolute bottom-0 left-[5%] right-[5%] border-t border-rule py-[1.6%] text-faint" style={{ fontSize: cq(1.15) }}>
          Eskai · citizen science with SPHEREx data · Data: NASA/IPAC IRSA · Unverified candidate: needs human confirmation
        </div>
      </div>
    </div>
  )
}

/** What a report looks like in the community feed, and the card you can share from it. */
export default function SightingExample() {
  return (
    <div className="space-y-4">
      <div className="border border-rule-strong bg-surface">
        <div className="border-l-2 border-transparent py-3 pl-3 pr-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-2 w-2 rotate-45" style={{ background: KIND.color }} />
              <span className="text-sm font-medium text-paper">{KIND.label}</span>
            </span>
            <span className="text-2xs text-faint">2 h ago</span>
          </div>
          <div className="mt-0.5 text-xs text-muted">
            by {EXAMPLE.handle} · {EXAMPLE.target}
          </div>
          <p className="mt-1 font-display text-sm italic leading-snug text-paper">{EXAMPLE.note}</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="inline-flex min-h-8 items-center gap-1.5 border border-accent bg-accent-wash px-2.5 text-accent">
              <CheckIcon className="h-4 w-4" /> I see it too · {EXAMPLE.confirmations}
            </span>
            <span className="text-faint">others check it before it counts for anything</span>
          </div>
        </div>
      </div>
      <CardPreview />
      <p className="font-mono text-2xs text-faint">An example, not a real report · the report card, and the card you can share from it</p>
    </div>
  )
}
