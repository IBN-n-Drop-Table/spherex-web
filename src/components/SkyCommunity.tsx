import { useEffect, useState } from 'react'
import { getTargetPatch } from '../api/spherex'
import { resolveAssetUrl } from '../api/http'
import { useTargetFacts } from '../hooks/useTargetFacts'
import { findTarget } from '../lib/story'
import type { CardImage } from '../lib/shareCard'
import type { ReportsState } from '../hooks/useReports'
import { useVerify } from '../hooks/useVerify'
import type { CitizenReport } from '../types/api'
import ReportCard from './ReportCard'
import ShareCardDialog from './ShareCardDialog'
import { Callout, Check } from './ui'

interface Props {
  feed: ReportsState
  /** Draw the reports as markers on the sky map. */
  showMarkers: boolean
  onShowMarkersChange: (v: boolean) => void
  highlightId: string | null
  /** Move the map to a report. */
  onLocate: (report: CitizenReport) => void
}

/** Community sightings on the sky map: the list, a switch for the markers, and "go to". */
export default function SkyCommunity({ feed, showMarkers, onShowMarkersChange, highlightId, onLocate }: Props) {
  const verify = useVerify(feed.replace)
  const [sharing, setSharing] = useState<CitizenReport | null>(null)
  const facts = useTargetFacts()
  // The card shows the SPHEREx image around the sighting. From the sky map there is no image on
  // screen, so for the five objects the cached image of the object is fetched for the card.
  const [cardImage, setCardImage] = useState<{ id: string; image: CardImage } | null>(null)
  useEffect(() => {
    if (!sharing) return
    const key = findTarget(facts, sharing.target_name)?.key
    if (!key) return
    const ctrl = new AbortController()
    getTargetPatch(key, ctrl.signal).then(
      d => {
        const url = d.timelapse_epochs[0]?.image_url
        if (url) setCardImage({ id: sharing.id, image: { url: resolveAssetUrl(url), patch: d.patch, targetName: d.target_info.name } })
      },
      () => undefined, // no image: the card falls back to its text-only layout
    )
    return () => ctrl.abort()
  }, [sharing, facts])

  return (
    <div data-testid="sky-community">
      <div className="space-y-2 border-b border-rule px-4 py-3">
        <Check checked={showMarkers} onChange={onShowMarkersChange}>
          Mark them on the map
        </Check>
        <p className="text-2xs text-faint">
          Sightings are candidates reported by people, not confirmed objects. To report your own, open the SPHEREx data of a place and use
          its Community panel.
        </p>
        {verify.error && <Callout tone="error">{verify.error}</Callout>}
      </div>
      {feed.loading ? (
        <p className="px-4 py-3 text-xs text-muted">Loading…</p>
      ) : feed.error ? (
        <div className="p-4">
          <Callout tone="error">{feed.error}</Callout>
        </div>
      ) : feed.reports.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted">No sightings reported yet.</p>
      ) : (
        <ul className="divide-y divide-rule" data-testid="sky-report-list">
          {feed.reports.map(r => (
            <ReportCard
              key={r.id}
              report={r}
              verified={verify.verified.has(r.id)}
              busy={verify.verifying === r.id}
              highlighted={r.id === highlightId}
              onLocate={() => onLocate(r)}
              onVerify={() => verify.confirm(r)}
              onShare={() => setSharing(r)}
            />
          ))}
        </ul>
      )}
      {sharing && <ShareCardDialog report={sharing} image={cardImage?.id === sharing.id ? cardImage.image : null} onClose={() => setSharing(null)} />}
    </div>
  )
}
