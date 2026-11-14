import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { fmt, parseDec, parseRa } from '../lib/coords'
import { LAYER_BASE } from '../lib/layers'

export interface UrlState {
  ra: number // degrees
  dec: number // degrees
  fov: number // arcmin
  band: string // LAYER_BASE | LAYER_DIFF | chemical filter name
}

// Default view: WISE 0855
export const DEFAULT_STATE: UrlState = { ra: 133.795129, dec: -7.245147, fov: 5, band: LAYER_BASE }

const EVENT = 'urlstatechange'

function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb)
  window.addEventListener(EVENT, cb)
  return () => {
    window.removeEventListener('popstate', cb)
    window.removeEventListener(EVENT, cb)
  }
}
const getSearch = () => window.location.search

function parse(search: string): UrlState {
  const p = new URLSearchParams(search)
  const ra = parseRa(p.get('ra') ?? '')
  const dec = parseDec(p.get('dec') ?? '')
  const fov = Number(p.get('fov') ?? NaN)
  return {
    ra: ra >= 0 && ra < 360 ? ra : DEFAULT_STATE.ra,
    dec: dec >= -90 && dec <= 90 ? dec : DEFAULT_STATE.dec,
    fov: fov > 0 ? fov : DEFAULT_STATE.fov,
    band: p.get('band') || DEFAULT_STATE.band,
  }
}

/**
 * Single source of truth for the view: ra, dec, fov, band live in the URL
 * (?ra=08h55m10s&dec=-7d14m42s&fov=5&band=H2O), so links are shareable and Back works.
 * Invalid or missing params fall back to defaults. Writes always use decimal degrees.
 */
export function useUrlState() {
  const search = useSyncExternalStore(subscribe, getSearch, () => '')
  const state = useMemo(() => parse(search), [search])

  const update = useCallback((patch: Partial<UrlState>, opts: { replace?: boolean } = {}) => {
    const next = { ...parse(window.location.search), ...patch }
    const params = new URLSearchParams(window.location.search) // keep unknown params
    params.set('ra', fmt(next.ra))
    params.set('dec', fmt(next.dec))
    params.set('fov', fmt(next.fov))
    if (next.band === LAYER_BASE) params.delete('band')
    else params.set('band', next.band)
    const url = `${window.location.pathname}?${params}${window.location.hash}`
    if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) return
    window.history[opts.replace ? 'replaceState' : 'pushState'](null, '', url)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return [state, update] as const
}
