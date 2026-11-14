import { getJson, postJson } from './http'
import type { JobResponse, SkyQuery } from '../types/api'

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
