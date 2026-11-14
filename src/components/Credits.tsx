import { useState } from 'react'

/** Data acknowledgements (required by the hackathon rules and by the data providers' terms). */
export default function Credits({ raised = false }: { raised?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`absolute left-3 z-10 max-w-md text-[11px] leading-snug text-slate-300 ${
        raised ? 'bottom-12' : 'bottom-3'
      }`}
    >
      {open && (
        <div className="mb-1 space-y-2 rounded bg-black/80 p-3 backdrop-blur">
          <p>
            <strong className="text-slate-100">Sky background:</strong> AllWISE colour mosaic (W1, W2, W4),
            served by the{' '}
            <a className="underline hover:text-sky-300" href="https://irsa.ipac.caltech.edu" target="_blank" rel="noreferrer">
              NASA/IPAC Infrared Science Archive
            </a>
            . This publication makes use of data products from the Wide-field Infrared Survey Explorer, which
            is a joint project of the University of California, Los Angeles, and the Jet Propulsion
            Laboratory/California Institute of Technology, funded by the National Aeronautics and Space
            Administration.
          </p>
          <p>
            This research has made use of the NASA/IPAC Infrared Science Archive, which is funded by the
            National Aeronautics and Space Administration and operated by the California Institute of
            Technology.
          </p>
          <p>
            <strong className="text-slate-100">SPHEREx data:</strong> exposures from the SPHEREx mission,
            retrieved from the NASA/IPAC Infrared Science Archive (IRSA) and processed by this project.
          </p>
          <p>
            <strong className="text-slate-100">Viewer:</strong>{' '}
            <a className="underline hover:text-sky-300" href="https://aladin.cds.unistra.fr/AladinLite/" target="_blank" rel="noreferrer">
              Aladin Lite
            </a>{' '}
            (CDS, Strasbourg Astronomical Data Center).
          </p>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="rounded bg-black/60 px-2 py-1 backdrop-blur hover:text-white"
      >
        Sky: AllWISE · NASA/IPAC IRSA · Aladin Lite (CDS) — {open ? 'hide' : 'data & credits'}
      </button>
    </div>
  )
}
