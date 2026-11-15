import { useEffect, useState } from 'react'
import { getCredits } from '../api/spherex'
import { LOCAL_CREDITS } from '../data/credits'
import type { CreditsResponse } from '../types/api'
import { Dialog } from './ui'

const link = 'text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent'

/**
 * Data acknowledgements (required by the hackathon rules and by the data providers' terms).
 * The same content is used in the credits dialog and in the landing page footer.
 */
export function CreditsContent({ credits = LOCAL_CREDITS }: { credits?: CreditsResponse }) {
  return (
    <div className="space-y-4 text-xs leading-relaxed text-muted">
      <p className="font-display text-sm italic text-paper">{credits.acknowledgement}</p>

      <section>
        <h3 className="label-caps mb-1.5 text-faint">Data used</h3>
        <ul className="divide-y divide-rule border-y border-rule">
          {credits.data_credits.map(c => (
            <li key={c.id} className="py-2">
              <div className="text-paper">
                {c.dataset} <span className="text-muted">· {c.source}</span>
              </div>
              <div>{c.used_for}.</div>
              <div>
                {c.citation ? `${c.citation}. ` : ''}
                <a className={link} href={c.url} target="_blank" rel="noreferrer">
                  {c.doi ? `DOI ${c.doi}` : 'Source'}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="label-caps text-faint">Sky map</h3>
        <p>
          <span className="text-paper">Infrared background:</span> AllWISE colour mosaic (W1, W2, W4), served by the{' '}
          <a className={link} href="https://irsa.ipac.caltech.edu" target="_blank" rel="noreferrer">
            NASA/IPAC Infrared Science Archive
          </a>
          . This publication makes use of data products from the Wide-field Infrared Survey Explorer, which is a joint project of the
          University of California, Los Angeles, and the Jet Propulsion Laboratory/California Institute of Technology, funded by the
          National Aeronautics and Space Administration.
        </p>
        <p>
          <span className="text-paper">Visible-light sky</span> (the "what your eye sees" side): DSS2 colour, served by IRSA.
        </p>
        <p>
          This research has made use of the NASA/IPAC Infrared Science Archive, which is funded by the National Aeronautics and Space
          Administration and operated by the California Institute of Technology.
        </p>
        <p>
          This research has made use of the SIMBAD database, operated at CDS, Strasbourg, France (Wenger et al. 2000, A&amp;AS 143, 9).
          Used for the distance of points that are not one of the five objects, and for catalogued objects near a position.
        </p>
        <p>
          <span className="text-paper">Viewer:</span>{' '}
          <a className={link} href="https://aladin.cds.unistra.fr/AladinLite/" target="_blank" rel="noreferrer">
            Aladin Lite
          </a>{' '}
          (CDS, Strasbourg Astronomical Data Center).
        </p>
      </section>

      {credits.software.length > 0 && (
        <section>
          <h3 className="label-caps mb-1 text-faint">Software</h3>
          <p>{credits.software.join(', ')}.</p>
        </section>
      )}
    </div>
  )
}

/** The credits, one click away from every screen. */
export default function CreditsDialog({ onClose }: { onClose: () => void }) {
  // The backend's own list is asked for when the dialog opens; until it answers (or if the server
  // is asleep or down) the local copy is shown, so the citations are never missing.
  const [fromServer, setFromServer] = useState<CreditsResponse | null>(null)
  useEffect(() => {
    const ctrl = new AbortController()
    getCredits(ctrl.signal).then(setFromServer, () => undefined)
    return () => ctrl.abort()
  }, [])
  return (
    <Dialog title="Data and credits" onClose={onClose} width="max-w-xl">
      <CreditsContent credits={fromServer ?? LOCAL_CREDITS} />
    </Dialog>
  )
}
