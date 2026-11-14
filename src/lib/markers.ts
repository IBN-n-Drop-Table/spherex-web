import type { AladinInstance } from 'aladin-lite'
import { TARGETS, targetPosition } from '../data/targets'

type AladinLib = (typeof import('aladin-lite'))['default']

export const POI_COLOR = '#facc15' // points of interest: stands out against the infrared sky

/**
 * Marks the five challenge targets on an Aladin map, at their SPHEREx-epoch position
 * (proper motion applied), optionally with their names.
 */
export function addTargetMarkers(
  A: AladinLib,
  aladin: AladinInstance,
  opts: { size: number; labels: boolean },
) {
  const catalog = A.catalog({
    name: 'Challenge targets',
    shape: 'circle',
    // Aladin's default is `true`: draw only footprints and silently skip plain point sources.
    onlyFootprints: false,
    sourceSize: opts.size,
    color: POI_COLOR,
    displayLabel: opts.labels,
    labelColumn: 'name',
    labelColor: POI_COLOR,
    labelFont: '12px sans-serif',
  })
  // Attach the catalog to the map first, then fill it (the documented order).
  aladin.addCatalog(catalog)
  catalog.addSources(
    TARGETS.map(t => {
      const { ra, dec } = targetPosition(t)
      return A.source(ra, dec, { name: t.name })
    }),
  )
}
