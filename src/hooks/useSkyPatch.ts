import { useEffect, useState } from 'react'
import { createSkyPatchJob, getJob } from '../api/spherex'
import { ApiError } from '../api/http'
import { awaitJob, JobFailedError, type JobProgress } from '../lib/jobs'
import type { SkyPatchResponse, SkyQuery } from '../types/api'

export type { JobProgress } from '../lib/jobs'

interface Settled {
  key: string
  data: SkyPatchResponse | null
  error: string | null
}

export interface SkyPatchState {
  /** Last successful response. Stays on screen while a new query loads or after an error. */
  data: SkyPatchResponse | null
  loading: boolean
  error: string | null
  /** Progress of the running job; null when cached (instant) or not loading. */
  job: JobProgress | null
}

function describeError(e: unknown): string {
  if (e instanceof JobFailedError) return e.message
  if (e instanceof ApiError) {
    const { status, detail } = e.problem
    // The backend's own message is the accurate one (e.g. a job that expired, a bad coordinate).
    if (status === 404) return detail ?? 'No SPHEREx data is available at these coordinates.'
    if (status === 422) {
      return detail
        ? `The backend rejected the query: ${detail}`
        : 'The backend rejected the query (check the coordinates and the field of view, 1 to 30 arcmin).'
    }
    if (status === 503) return 'The backend is busy. Try again in a moment.'
    if (status >= 500) return 'The server had a problem. Try again in a moment.'
    if (detail) return detail
  }
  return String(e)
}

export function useSkyPatch(q: SkyQuery | null): SkyPatchState {
  const { ra, dec, fov } = q ?? {}
  const key = ra === undefined || dec === undefined || fov === undefined ? null : `${ra}|${dec}|${fov}`
  const [settled, setSettled] = useState<Settled | null>(null)
  const [job, setJob] = useState<JobProgress | null>(null)

  useEffect(() => {
    if (key === null) return
    const ctrl = new AbortController()
    const run = async (): Promise<SkyPatchResponse> => {
      const first = await createSkyPatchJob({ ra, dec, fov }, ctrl.signal)
      return awaitJob<SkyPatchResponse>(first, id => getJob(id, ctrl.signal), {
        signal: ctrl.signal,
        onProgress: setJob,
      })
    }

    run()
      .then(data => setSettled({ key, data, error: null }))
      .catch(e => {
        // Keep the last good data: a failed query must not wipe the controls.
        if (!ctrl.signal.aborted) {
          setSettled(prev => ({ key, data: prev?.data ?? null, error: describeError(e) }))
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setJob(null)
      })
    return () => ctrl.abort()
  }, [key, ra, dec, fov])

  // Loading is derived: the last settled result belongs to a different query.
  const loading = key !== null && settled?.key !== key
  return {
    data: settled?.data ?? null,
    loading,
    error: loading ? null : (settled?.error ?? null),
    job: loading ? job : null,
  }
}
