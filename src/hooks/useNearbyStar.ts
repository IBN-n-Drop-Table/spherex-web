import { useEffect, useState } from 'react'
import { nearestStar, type NearbyStar } from '../lib/simbad'

// Answers by position, so going back and forth does not ask SIMBAD again.
const cache = new Map<string, NearbyStar | null>()
const keyOf = (ra: number, dec: number) => `${ra.toFixed(5)}|${dec.toFixed(5)}`

/**
 * What SIMBAD has at this position: `undefined` while asking (or not asked / SIMBAD failed),
 * `null` when no star with a usable parallax lies within 10″, else the star.
 */
export function useNearbyStar(ra: number, dec: number, enabled: boolean): NearbyStar | null | undefined {
  const key = keyOf(ra, dec)
  const [found, setFound] = useState<{ key: string; star: NearbyStar | null } | null>(null)
  useEffect(() => {
    if (!enabled || cache.has(key)) return
    const ctrl = new AbortController()
    nearestStar(ra, dec, ctrl.signal).then(
      star => {
        cache.set(key, star)
        setFound({ key, star })
      },
      () => undefined, // a failure just means no line: it is a nicety, not data we depend on
    )
    return () => ctrl.abort()
  }, [enabled, key, ra, dec])
  if (!enabled) return undefined
  return cache.has(key) ? cache.get(key) : found?.key === key ? found.star : undefined
}
