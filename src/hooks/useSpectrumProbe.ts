import { useEffect, useState } from 'react'
import { getJob, getSpectrumAt } from '../api/spherex'
import { ApiError } from '../api/http'
import { awaitJob, JobFailedError, retryIfLost, type JobProgress } from '../lib/jobs'
import type { SpectrumResponse } from '../types/api'

export interface ProbePoint {
  ra: number
  dec: number
  fov: number // arcmin; only matters when a live job is needed
}

export interface SpectrumProbeState {
  data: SpectrumResponse | null
  loading: boolean
  error: string | null
  job: JobProgress | null
}

const IDLE: SpectrumProbeState = { data: null, loading: false, error: null, job: null }

function describeError(e: unknown): string {
  if (e instanceof JobFailedError) return e.message
  if (e instanceof ApiError) {
    const { status, detail } = e.problem
    if (status === 503) return 'The backend is busy. Try again in a moment.'
    if (status === 422) return detail ? `The backend rejected that position: ${detail}` : 'The backend rejected that position.'
    if (status >= 500) return 'The server had a problem. Try again in a moment.'
    if (detail) return detail // e.g. a job that expired while we were waiting
  }
  return String(e)
}

interface Settled {
  key: string
  data: SpectrumResponse | null
  error: string | null
}

/**
 * Spectrum of an arbitrary position ("free click"). Near a cached target or anomaly it is instant;
 * anywhere else the backend computes it live. Unlike the sky patch, a stale result is never kept:
 * it would belong to another point.
 */
export function useSpectrumProbe(point: ProbePoint | null): SpectrumProbeState {
  const key = point ? `${point.ra.toFixed(6)}|${point.dec.toFixed(6)}|${point.fov}` : null
  const [settled, setSettled] = useState<Settled | null>(null)
  const [job, setJob] = useState<JobProgress | null>(null)
  const ra = point?.ra
  const dec = point?.dec
  const fov = point?.fov

  useEffect(() => {
    if (key === null || ra === undefined || dec === undefined || fov === undefined) return
    const ctrl = new AbortController()
    const run = (): Promise<SpectrumResponse> =>
      retryIfLost(async () => {
        const first = await getSpectrumAt({ ra, dec, fov }, ctrl.signal)
        if ('ready' in first) return first.ready
        return awaitJob<SpectrumResponse>(first.job, id => getJob(id, ctrl.signal), {
          signal: ctrl.signal,
          onProgress: setJob,
        })
      }, ctrl.signal)
    run()
      .then(data => setSettled({ key, data, error: null }))
      .catch(e => {
        if (!ctrl.signal.aborted) setSettled({ key, data: null, error: describeError(e) })
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setJob(null)
      })
    return () => ctrl.abort()
  }, [key, ra, dec, fov])

  if (key === null) return IDLE
  if (settled?.key !== key) return { data: null, loading: true, error: null, job }
  return { data: settled.data, loading: false, error: settled.error, job: null }
}
