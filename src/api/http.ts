import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
export class TimeoutError extends Error {}

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
    if (timeout.aborted) throw new TimeoutError(`Sin respuesta del servidor en ${timeoutMs} ms`)
    throw e
  }
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return (await res.json()) as T
}

// Allow relative image URLs ("/static/x.png")
export const resolveAssetUrl = (url: string): string => buildUrl(url).toString()
