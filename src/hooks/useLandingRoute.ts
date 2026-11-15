import { useCallback, useSyncExternalStore } from 'react'

// The viewer's state lives in these query parameters (see useUrlState). A URL with none of them is
// a plain visit to the site: that shows the landing page. Any link that carries one of them goes
// straight to the viewer, so shared and embedded links behave exactly as before.
const VIEW_PARAMS = ['ra', 'dec', 'fov', 'band', 'view']
const URL_EVENT = 'urlstatechange' // the event useUrlState fires after it writes the URL

function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb)
  window.addEventListener(URL_EVENT, cb)
  return () => {
    window.removeEventListener('popstate', cb)
    window.removeEventListener(URL_EVENT, cb)
  }
}
const hasViewState = () => {
  const p = new URLSearchParams(window.location.search)
  return VIEW_PARAMS.some(k => p.has(k))
}

/** `onLanding` is true while the URL carries no viewer state; `goHome` returns to the landing page. */
export function useLandingRoute() {
  const onLanding = !useSyncExternalStore(subscribe, hasViewState, () => true)
  const goHome = useCallback(() => {
    window.history.pushState(null, '', window.location.pathname)
    window.dispatchEvent(new Event(URL_EVENT))
    window.scrollTo(0, 0)
  }, [])
  /** Enters the viewer with this query (for example `view=sky&tool=compare`) without a page load. */
  const openViewer = useCallback((query: string) => {
    window.history.pushState(null, '', `${window.location.pathname}?${query}`)
    window.dispatchEvent(new Event(URL_EVENT))
  }, [])
  return { onLanding, goHome, openViewer }
}
