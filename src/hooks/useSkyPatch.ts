import { useEffect, useState } from 'react'
import { createSkyPatchJob, getJob } from '../api/spherex'
import { ApiError } from '../api/http'
import type { SkyPatchResponse, SkyQuery } from '../types/api'

const DEFAULT_POLL_MS = 1500
// Cold live jobs take 40-100 s (measured by the backend); leave generous headroom.
const JOB_TIMEOUT_MS = 5 * 60_000

/** A job that ended with `status: failed` (the message is already readable). */
class JobFailedError extends Error {}

export interface JobProgress {
  stage: string | null // queued | query | download | stack | render | done
  progress: number // 0..1
  message: string | null
  etaSeconds: number | null
}

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
    if (e.status === 404) return 'No SPHEREx data is available at these coordinates.'
    if (e.status === 422) return 'The backend rejected the query (check the coordinates and the field of view, 1 to 30 arcmin).'
    if (e.status === 503) return 'The backend is busy. Try again in a moment.'
  }
  return String(e)
}

/** Resolves after `ms`, or rejects when `signal` aborts. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

export function useSkyPatch(q: SkyQuery | null): SkyPatchState {
  const { ra, dec, fov } = q ?? {}
  const key = ra === undefined || dec === undefined || fov === undefined ? null : `${ra}|${dec}|${fov}`
  const [settled, setSettled] = useState<Settled | null>(null)
  const [job, setJob] = useState<JobProgress | null>(null)

  useEffect(() => {
    if (key === null) return
    const ctrl = new AbortController()
    const deadline = Date.now() + JOB_TIMEOUT_MS

    const run = async (): Promise<SkyPatchResponse> => {
      let current = await createSkyPatchJob({ ra, dec, fov }, ctrl.signal)
      for (;;) {
        if (current.status === 'completed' && current.result) return current.result
        if (current.status === 'failed') {
          throw new JobFailedError(current.error ?? 'The SPHEREx job failed.')
        }
        setJob({
          stage: current.stage ?? null,
          progress: current.progress ?? 0,
          message: current.message ?? null,
          etaSeconds: current.eta_s ?? null,
        })
        if (Date.now() > deadline) throw new Error('Timed out waiting for the SPHEREx job.')
        await sleep(current.retry_after_ms ?? DEFAULT_POLL_MS, ctrl.signal)
        current = await getJob(current.job_id, ctrl.signal)
      }
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
