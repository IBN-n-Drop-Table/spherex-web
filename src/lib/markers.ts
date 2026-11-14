import type { AladinInstance } from 'aladin-lite'
import { TARGETS, targetPosition } from '../data/targets'
import { CLASSIFICATIONS, classificationInfo } from './reports'
import type { CitizenReport } from '../types/api'
import type { Catalog } from 'aladin-lite'

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
    name: 'Points of interest',
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

/**
 * Draws community reports as diamonds, coloured by classification (Aladin colours a whole catalog,
 * so there is one catalog per class). Each source carries its report id so a click can find it.
 * Returns the catalogs created: pass them to `aladin.remove` before drawing again.
 */
export function addCommunityMarkers(
  A: AladinLib,
  aladin: AladinInstance,
  reports: CitizenReport[],
  highlightId: string | null,
): Catalog[] {
  const made: Catalog[] = []
  const add = (name: string, color: string, size: number, shape: string, items: CitizenReport[]) => {
    if (items.length === 0) return
    const catalog = A.catalog({ name, shape, sourceSize: size, color, onlyFootprints: false })
    aladin.addCatalog(catalog) // attach first, then fill (see addTargetMarkers)
    catalog.addSources(
      items.map(r =>
        A.source(r.ra_deg, r.dec_deg, {
          reportId: r.id,
          label: `${classificationInfo(r.classification).label} · ${r.discoverer}`,
        }),
      ),
    )
    made.push(catalog)
  }
  for (const c of CLASSIFICATIONS) {
    add(`Community · ${c.label}`, c.color, 14, 'rhomb', reports.filter(r => r.classification === c.value))
  }
  const hi = reports.filter(r => r.id === highlightId)
  add('Community · selected', '#ffffff', 28, 'circle', hi) // drawn last: a ring around the chosen one
  return made
}
