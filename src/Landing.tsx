import { createContext, useContext, type ReactNode } from 'react'
import { CreditsContent } from './components/Credits'
import { ArrowRightIcon } from './components/icons'
import { btnPrimary } from './components/classes'
import { EXAMPLE_CHAT, LANDING_OBJECTS } from './data/landing'
import AimDiagram from './landing/AimDiagram'
import BlinkFigure from './landing/BlinkFigure'
import SightingExample from './landing/SightingExample'
import SpectrumSpark from './landing/SpectrumSpark'
import WipeDemo from './landing/WipeDemo'

interface Props {
  /** Enter the viewer with this query string (no page load). */
  onOpen: (query: string) => void
}

// Where each link of the page lands in the viewer.
const BARNARD = 'ra=269.452075&dec=4.693391&fov=5&view=data'
const EPSILON = 'ra=331.076667&dec=-56.7825&fov=5&view=data'
const SKY = 'ra=133.795129&dec=-7.245147&fov=60'
const GO = {
  explore: SKY,
  barnard: BARNARD,
  compare: 'ra=83.82&dec=-5.39&fov=150&tool=compare',
  difference: `${BARNARD}&band=difference`,
  spectrum: `${EPSILON}&tool=spectrum`,
  play: `${SKY}&tool=play`,
  aim: `${SKY}&tool=aim`,
  ask: `${BARNARD}&tool=ask`,
  report: `${BARNARD}&tool=community`,
  sightings: `${SKY}&tool=sightings`,
}

const external = 'text-paper underline decoration-rule-strong underline-offset-4 hover:decoration-accent'

const OpenContext = createContext<(query: string) => void>(() => undefined)

/** A real link (middle-click works) that enters the viewer without reloading the page. */
function ViewerLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  const onOpen = useContext(OpenContext)
  return (
    <a
      href={`?${to}`}
      onClick={e => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        onOpen(to)
      }}
      className={className ?? 'inline-flex min-h-11 items-center gap-1.5 text-sm text-accent underline-offset-4 hover:underline md:min-h-0'}
    >
      {children}
    </a>
  )
}

/**
 * The landing page: what this is, shown rather than told, with real SPHEREx pictures. It makes no
 * network request of its own, so it works while the backend is asleep, and it never loads the
 * sky viewer (that only happens once someone enters it).
 */
export default function Landing({ onOpen }: Props) {
  const more = (to: string, text: string) => (
    <ViewerLink to={to}>
      {text} <ArrowRightIcon className="h-4 w-4" />
    </ViewerLink>
  )

  return (
    <OpenContext.Provider value={onOpen}>
    <div className="min-h-dvh bg-ink text-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <span className="font-display text-xl">
          SPHEREx <span className="italic text-muted">Sky Explorer</span>
        </span>
        <ViewerLink to={GO.explore} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-paper md:min-h-0">
          Open the viewer <ArrowRightIcon className="h-4 w-4" />
        </ViewerLink>
      </header>

      <main>
        {/* ------------------------------------------------------------------ opening */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-8 md:grid-cols-12 md:gap-8 md:pb-28 md:pt-14">
          <div className="md:col-span-6">
            <p className="label-caps text-faint">NASA Space Apps 2026 · Planet X and SPHEREx</p>
            <h1 className="mt-5 font-display text-6xl leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
              Watch the sky <span className="italic">move.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted md:text-lg">
              NASA's SPHEREx telescope maps the whole sky every six months, in 102 colours of infrared light. Flick between two visits and
              the nearby stars give themselves away: they are the ones that shifted.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <ViewerLink to={GO.explore} className={`${btnPrimary} md:min-h-11 md:px-5 md:text-base`}>
                Explore the sky <ArrowRightIcon className="h-4 w-4" />
              </ViewerLink>
              {more(GO.barnard, "or start with Barnard's Star")}
            </div>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
              Saw something that moved? <ViewerLink to={GO.sightings} className="text-paper underline decoration-rule-strong underline-offset-4 hover:decoration-accent">Report it</ViewerLink>, and let others confirm it.
            </p>
          </div>
          <div className="md:col-span-6 md:pl-6">
            <BlinkFigure
              alt="Barnard's Star in two SPHEREx visits a year apart: it has moved slightly"
              frames={[
                { src: '/landing/barnard-1.png', label: 'Visit 1 · Aug 2025' },
                { src: '/landing/barnard-3.png', label: 'Visit 3 · Aug 2026' },
              ]}
            />
            <p className="mt-3 flex flex-wrap justify-between gap-x-4 font-mono text-2xs text-faint">
              <span>Barnard's Star · two SPHEREx visits, a year apart</span>
              <span>Real pixels, not an illustration</span>
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------------ features */}
        <section className="border-t border-rule">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
            <p className="label-caps text-faint">What you can do here</p>

            {/* 1. eye vs infrared: the big one, a working demo */}
            <div className="mt-8 grid items-center gap-8 md:grid-cols-12">
              <div className="md:col-span-7">
                <WipeDemo visible="/landing/orion-visible.jpg" infrared="/landing/orion-infrared.jpg" alt="The Orion Nebula region in visible light and in infrared" />
                <p className="mt-2 font-mono text-2xs text-faint">Near the Orion Nebula · visible: DSS2 · infrared: AllWISE, via NASA/IPAC IRSA</p>
              </div>
              <div className="md:col-span-5 md:pl-6">
                <h2 className="font-display text-4xl leading-tight">See what your eyes cannot.</h2>
                <p className="mt-3 max-w-sm leading-relaxed text-muted">The same patch of sky in visible light and in infrared. Drag the bar: dust that hides stars from you glows on the other side.</p>
                <p className="mt-4">{more(GO.compare, 'Try it on the whole sky')}</p>
              </div>
            </div>

            {/* 2 + 3. what changed, what it is made of */}
            <div className="mt-20 grid gap-12 md:mt-28 md:grid-cols-12 md:gap-8">
              <div className="md:col-span-4">
                <BlinkFigure
                  every={1500}
                  alt="Differences between consecutive SPHEREx visits of Barnard's Star: a red and a blue lobe where the star moved, and small red and blue pairs around it"
                  frames={[
                    { src: '/landing/barnard-diff-12.png', label: 'Visit 1 to 2' },
                    { src: '/landing/barnard-diff-23.png', label: 'Visit 2 to 3' },
                  ]}
                />
                <p className="mt-2 font-mono text-2xs leading-relaxed text-faint">Barnard's Star · each visit minus the one before. Its core is saturated, so the exact shape of the lobes is not reliable.</p>
                <h2 className="mt-5 font-display text-3xl leading-tight">Spot what changed.</h2>
                <p className="mt-2 leading-relaxed text-muted">
                  Subtract one visit from another and everything that stayed put disappears. <span className="text-later">Red</span> is where the star
                  is now, <span className="text-earlier">blue</span> is where it was.
                </p>
                <p className="mt-3">{more(GO.difference, 'Open the difference view')}</p>
              </div>

              <div className="md:col-span-7 md:col-start-6">
                <div className="grid grid-cols-3 gap-px border border-rule-strong bg-rule-strong">
                  {(
                    [
                      ['epsilon-h2o', 'Water'],
                      ['epsilon-co2', 'Carbon dioxide'],
                      ['epsilon-co', 'Carbon monoxide'],
                    ] as const
                  ).map(([file, name]) => (
                    <div key={file} className="relative aspect-square bg-sunken">
                      <img src={`/landing/${file}.png`} alt={`Epsilon Indi B at the wavelengths of ${name.toLowerCase()}`} loading="lazy" className="h-full w-full [image-rendering:pixelated]" />
                      <span className="label-caps absolute left-1.5 top-1.5 bg-ink/85 px-1.5 py-0.5 text-paper">{name}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-b border-rule pb-1">
                  <SpectrumSpark />
                </div>
                <p className="mt-2 font-mono text-2xs text-faint">Epsilon Indi B · its light, split by SPHEREx into infrared colours</p>
                <h2 className="mt-5 font-display text-3xl leading-tight">Read what it is made of.</h2>
                <p className="mt-2 max-w-lg leading-relaxed text-muted">
                  Every object gets a spectrum: its brightness in each of the 102 infrared bands. Water, carbon dioxide and carbon monoxide each leave
                  their mark at their own wavelengths.
                </p>
                <p className="mt-3">{more(GO.spectrum, 'See this spectrum in the viewer')}</p>
              </div>
            </div>

            {/* 4, 5, 6: three smaller things, each shown its own way */}
            <div className="mt-20 grid gap-12 border-t border-rule pt-12 md:mt-28 md:grid-cols-3 md:gap-0 md:divide-x md:divide-rule">
              <div className="md:pr-8">
                <BlinkFigure
                  compact
                  className="max-w-[15rem]"
                  alt="Epsilon Indi B in two SPHEREx visits"
                  frames={[
                    { src: '/landing/epsilon-1.png', label: 'Earlier' },
                    { src: '/landing/epsilon-4.png', label: 'Later' },
                  ]}
                />
                <h2 className="mt-5 font-display text-2xl leading-tight">Find what moves.</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">A short game on real images. Two visits flicker; you click where something moved.</p>
                <p className="mt-3">{more(GO.play, 'Play a round')}</p>
              </div>
              <div className="md:px-8">
                <div className="max-w-[17rem]">
                  <AimDiagram />
                </div>
                <h2 className="mt-5 font-display text-2xl leading-tight">Point at the sky.</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">Say where you are and which way you look. The map shows that sky, right now. On a phone, its compass can do the aiming.</p>
                <p className="mt-3">{more(GO.aim, 'See what is above you')}</p>
              </div>
              <div className="md:pl-8">
                <div className="space-y-3 text-sm">
                  <p className="ml-6 border border-rule-strong bg-raised px-3 py-2">{EXAMPLE_CHAT.question}</p>
                  <p className="border-l border-rule-strong pl-3 leading-relaxed text-paper">{EXAMPLE_CHAT.answer}</p>
                  <p className="pl-3 text-2xs text-faint">An example answer. The assistant can be wrong: findings need human verification.</p>
                </div>
                <h2 className="mt-5 font-display text-2xl leading-tight">Ask in plain words.</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">An assistant explains what is on your screen, simply or with the terms astronomers use.</p>
                <p className="mt-3">{more(GO.ask, 'Ask about Barnard’s Star')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ community sightings */}
        <section className="border-t border-rule bg-surface">
          <div className="mx-auto grid max-w-6xl items-start gap-12 px-5 py-16 md:grid-cols-12 md:gap-8 md:py-24">
            <div className="md:col-span-5">
              <p className="label-caps text-faint">Citizen science</p>
              <h2 className="mt-4 font-display text-5xl leading-[1.02] md:text-6xl">
                Spotted something? <span className="italic">Say so.</span>
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
                No telescope is big enough to look at everything. Volunteers have always been the extra pair of eyes: click what looks odd, say
                what you think it is, and let other people check it.
              </p>
              <ol className="mt-8 max-w-md divide-y divide-rule border-y border-rule">
                {(
                  [
                    ['1', 'Pick a point', 'Click anything in a SPHEREx image, or a circle the software drew on the Detections layer.'],
                    ['2', 'Say what you think it is', 'An asteroid, a brown dwarf, a variable star, or just “something odd”. Add a note if you like.'],
                    ['3', 'Others check it', 'Anyone can press “I see it too”. A sighting is a candidate until people have looked.'],
                    ['4', 'Share it', 'Every report makes a card you can download or send, with its coordinates and its unverified label.'],
                  ] as const
                ).map(([n, title, text]) => (
                  <li key={n} className="flex gap-4 py-3.5">
                    <span className="w-5 shrink-0 font-display text-2xl italic leading-6 text-faint">{n}</span>
                    <span>
                      <span className="block text-paper">{title}</span>
                      <span className="block text-sm leading-relaxed text-muted">{text}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <ViewerLink to={GO.report} className={btnPrimary}>
                  Report a sighting <ArrowRightIcon className="h-4 w-4" />
                </ViewerLink>
                {more(GO.sightings, 'or read what people reported')}
              </div>
              <p className="mt-5 max-w-md text-xs leading-relaxed text-faint">
                Nothing is confirmed by being reported. The point is to gather candidates for people, and later for astronomers, to look at.
              </p>
            </div>
            <div className="md:col-span-7 md:pl-8">
              <SightingExample />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ the five objects */}
        <section className="border-t border-rule bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-12 md:py-24">
            <div className="md:col-span-4">
              <p className="label-caps text-faint">Start with these five</p>
              <h2 className="mt-4 font-display text-4xl leading-tight">Five objects, five stories.</h2>
              <p className="mt-3 max-w-xs leading-relaxed text-muted">The objects NASA's challenge asks every tool to be tested on. Each opens with its SPHEREx images, visit by visit.</p>
            </div>
            <ol className="divide-y divide-rule border-y border-rule md:col-span-8">
              {LANDING_OBJECTS.map(o => (
                <li key={o.key}>
                  <ViewerLink to={`ra=${o.ra}&dec=${o.dec}&fov=5&view=data`} className="group flex items-center gap-4 py-4 transition-colors hover:bg-raised md:gap-6 md:px-3">
                    <img src={o.image} alt="" loading="lazy" className="h-16 w-16 shrink-0 border border-rule-strong [image-rendering:pixelated] md:h-20 md:w-20" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-3">
                        <span className="font-display text-2xl">{o.name}</span>
                        <span className="text-xs text-muted">{o.kind}</span>
                      </span>
                      <span className="mt-1 block font-display text-base italic leading-snug text-muted">{o.story}</span>
                      <span className="mt-1 block font-mono text-2xs text-faint">
                        RA {o.ra.toFixed(4)}° · Dec {o.dec.toFixed(4)}°
                      </span>
                    </span>
                    <ArrowRightIcon className="h-5 w-5 shrink-0 text-faint transition-colors group-hover:text-accent" />
                  </ViewerLink>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------------ honest strip */}
        <section className="border-t border-rule">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
            <p className="label-caps text-faint">What you are looking at</p>
            <div className="mt-8 grid gap-10 md:grid-cols-3 md:gap-12">
              {(
                [
                  ['i.', 'Real data', 'Every picture is made from SPHEREx images in NASA’s public archive. The five objects above are ready at once; any other place is processed when you ask, which takes a little while.'],
                  ['ii.', 'Candidates, not claims', 'Software marks what changed between visits, and people can report what they see. Every mark is a candidate until others check it. Nothing here is a confirmed finding.'],
                ] as const
              ).map(([n, title, text]) => (
                <div key={n}>
                  <div className="font-display text-3xl italic text-faint">{n}</div>
                  <h3 className="mt-2 font-display text-2xl">{title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{text}</p>
                </div>
              ))}
              <div>
                <div className="font-display text-3xl italic text-faint">iii.</div>
                <h3 className="mt-2 font-display text-2xl">People are needed</h3>
                <p className="mt-2 leading-relaxed text-muted">
                  NASA expects images of more than a billion objects from SPHEREx, too many for any one person. It says most of the known comets and
                  brown dwarfs were found by volunteers comparing images like these, in projects such as{' '}
                  <a className={external} href="https://backyardworlds.org" target="_blank" rel="noreferrer">
                    Backyard Worlds
                  </a>
                  .
                </p>
              </div>
            </div>
            <div className="mt-14">
              <ViewerLink to={GO.explore} className={`${btnPrimary} md:min-h-11 md:px-5 md:text-base`}>
                Explore the sky <ArrowRightIcon className="h-4 w-4" />
              </ViewerLink>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------------ footer: credits */}
      <footer className="border-t border-rule bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-12">
          <div className="space-y-4 md:col-span-4">
            <p className="font-display text-xl">
              SPHEREx <span className="italic text-muted">Sky Explorer</span>
            </p>
            <p className="text-sm leading-relaxed text-muted">
              A citizen-science viewer built for the 2026 NASA Space Apps Challenge, “Planet X and SPHEREx”. The figures about the mission on this page are
              from NASA’s description of the challenge.
            </p>
            <ul className="space-y-1.5 text-sm">
              <li>
                <a className={external} href="https://irsa.ipac.caltech.edu/Missions/spherex.html" target="_blank" rel="noreferrer">
                  SPHEREx data at NASA/IPAC IRSA
                </a>
              </li>
              <li>
                <a className={external} href="https://backyardworlds.org" target="_blank" rel="noreferrer">
                  Backyard Worlds
                </a>
              </li>
              <li>
                <a className={external} href="https://aladin.cds.unistra.fr/AladinLite/" target="_blank" rel="noreferrer">
                  Aladin Lite (CDS)
                </a>
              </li>
            </ul>
          </div>
          <div className="md:col-span-8">
            <h2 className="label-caps mb-4 text-faint">Data and credits</h2>
            <CreditsContent />
          </div>
        </div>
      </footer>
    </div>
    </OpenContext.Provider>
  )
}
