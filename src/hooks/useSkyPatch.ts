import { useEffect, useState } from 'react'
import { getSkyPatch } from '../api/spherex'
import type { SkyPatchResponse, SkyQuery } from '../types/api'

interface Settled {
  key: string
  data: SkyPatchResponse | null
  error: string | null
}

export interface SkyPatchState {
  /** Last successful response. Stays on screen while a new query loads. Null after an error. */
  data: SkyPatchResponse | null
  loading: boolean
  error: string | null
}

export function useSkyPatch(q: SkyQuery | null): SkyPatchState {
  const { ra, dec, fov } = q ?? {}
  const key = ra === undefined || dec === undefined || fov === undefined ? null : `${ra}|${dec}|${fov}`
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    if (key === null) return
    const ctrl = new AbortController()
    getSkyPatch({ ra, dec, fov }, ctrl.signal)
      .then(data => setSettled({ key, data, error: null }))
      .catch(e => {
        if (!ctrl.signal.aborted) setSettled({ key, data: null, error: String(e) })
      })
    return () => ctrl.abort()
  }, [key, ra, dec, fov])

  // Loading is derived: the last settled result belongs to a different query.
  const loading = key !== null && settled?.key !== key
  return {
    data: settled?.data ?? null,
    loading,
    error: loading ? null : (settled?.error ?? null),
  }
}
