import { Suspense, lazy } from 'react'
import { useLandingRoute } from './hooks/useLandingRoute'
import Landing from './Landing'

// The viewer (Aladin, charts, the game) is only downloaded when someone opens it: the landing
// page stays light and works with the backend asleep.
const Viewer = lazy(() => import('./Viewer'))

/**
 * A visit with no view state in the URL shows the landing page. Any link that carries coordinates
 * or a view (`?ra=…&dec=…`, `?view=data`) goes straight to the viewer, as it always did.
 */
export default function App() {
  const { onLanding, goHome, openViewer } = useLandingRoute()
  if (onLanding) return <Landing onOpen={openViewer} />
  return (
    <Suspense fallback={<div className="h-dvh bg-ink" />}>
      <Viewer onHome={goHome} />
    </Suspense>
  )
}
