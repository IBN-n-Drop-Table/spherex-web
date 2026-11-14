import { getJson } from './http'
import type { SkyPatchResponse, SkyQuery } from '../types/api'

export function getSkyPatch(q: SkyQuery, signal?: AbortSignal) {
  return getJson<SkyPatchResponse>('/api/v1/sky-patch', { ...q }, { signal })
}
