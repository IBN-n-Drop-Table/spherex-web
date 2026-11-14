import { getJson, getJsonWithStatus, postJson } from './http'
import type {
  CitizenReport,
  CitizenReportCreate,
  Classification,
  JobResponse,
  SkyQuery,
  SpectrumResponse,
} from '../types/api'

/**
 * Starts (or reuses) the computation for a position. Cached targets come back 200 `completed`
 * with the result already inside; anything else is 202 `queued` and must be polled.
 */
export function createSkyPatchJob(q: SkyQuery, signal?: AbortSignal) {
  return postJson<JobResponse>('/api/v1/jobs', { kind: 'sky_patch', ...q }, { signal })
}

export function getJob(jobId: string, signal?: AbortSignal) {
  return getJson<JobResponse>(`/api/v1/jobs/${jobId}`, {}, { signal })
}

/**
 * Spectrum at a position. Within `radius_arcsec` of a cached target or anomaly it is ready at once
 * (200); anywhere else the backend starts a live job (202) that must be polled.
 */
export async function getSpectrumAt(
  q: { ra: number; dec: number; fov?: number; radius_arcsec?: number },
  signal?: AbortSignal,
): Promise<{ ready: SpectrumResponse } | { job: JobResponse }> {
  const { status, data } = await getJsonWithStatus<SpectrumResponse | JobResponse>(
    '/api/v1/spectrum',
    { ...q },
    { signal },
  )
  return status === 202 ? { job: data as JobResponse } : { ready: data as SpectrumResponse }
}

/** Community feed, newest first. `target_name` accepts "WISE 0855" or "WISE_0855". */
export function listReports(
  q: { target_name?: string; classification?: Classification; limit?: number } = {},
  signal?: AbortSignal,
) {
  return getJson<CitizenReport[]>('/api/v1/reports', { ...q }, { signal })
}

export function submitReport(body: CitizenReportCreate, signal?: AbortSignal) {
  return postJson<CitizenReport>('/api/v1/reports', body, { signal })
}

/** Peer confirmation: returns the report with `verifications_count` + 1. */
export function verifyReport(id: string, signal?: AbortSignal) {
  return postJson<CitizenReport>(`/api/v1/reports/${id}/verify`, {}, { signal })
}
