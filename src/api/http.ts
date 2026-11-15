import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config'
import { parseProblem, type ApiProblem } from './problem'

export class ApiError extends Error {
  status: number
  /** Seconds the server asks us to wait (the `Retry-After` header of a 429), when it sent one. */
  retryAfterS: number | null
  constructor(status: number, message: string, retryAfterS: number | null = null) {
    super(message) // the raw response body
    this.status = status
    this.retryAfterS = retryAfterS
  }
  /** The body read as the backend's error shape (works with the old and the new one). */
  get problem(): ApiProblem {
    return parseProblem(this.status, this.message)
  }
}
export class TimeoutError extends Error {}

async function apiError(res: Response): Promise<ApiError> {
  const header = Number(res.headers.get('retry-after'))
  return new ApiError(res.status, await res.text(), Number.isFinite(header) && header > 0 ? header : null)
}

type Params = Record<string, string | number | undefined>

export function buildUrl(path: string, params: Params = {}): URL {
  const url = new URL(path, API_BASE_URL || window.location.origin)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v))
  }
  return url
}

export async function getJson<T>(
  path: string,
  params: Params = {},
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS
  const timeout = AbortSignal.timeout(timeoutMs)
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout

  let res: Response
  try {
    res = await fetch(buildUrl(path, params), { signal })
  } catch (e) {
    if (timeout.aborted) throw new TimeoutError(`No response from the server in ${timeoutMs} ms`)
    throw e
  }
  if (!res.ok) throw await apiError(res)
  return (await res.json()) as T
}

/** Like getJson, but keeps the status: /spectrum answers 200 (ready) or 202 (a job to poll). */
export async function getJsonWithStatus<T>(
  path: string,
  params: Params = {},
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<{ status: number; data: T }> {
  const timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS
  const timeout = AbortSignal.timeout(timeoutMs)
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout
  let res: Response
  try {
    res = await fetch(buildUrl(path, params), { signal })
  } catch (e) {
    if (timeout.aborted) throw new TimeoutError(`No response from the server in ${timeoutMs} ms`)
    throw e
  }
  if (!res.ok) throw await apiError(res)
  return { status: res.status, data: (await res.json()) as T }
}

export async function postJson<T>(
  path: string,
  body: unknown,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS
  const timeout = AbortSignal.timeout(timeoutMs)
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout

  let res: Response
  try {
    res = await fetch(buildUrl(path), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (timeout.aborted) throw new TimeoutError(`No response from the server in ${timeoutMs} ms`)
    throw e
  }
  if (!res.ok) throw await apiError(res) // 2xx incl. 202 are fine
  return (await res.json()) as T
}

// Allow relative image URLs ("/static/x.png")
export const resolveAssetUrl = (url: string): string => buildUrl(url).toString()
