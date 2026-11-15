import { ApiError } from '../api/http'
import type { JobResponse } from '../types/api'

const DEFAULT_POLL_MS = 1500
// Cold live jobs take tens of seconds up to a couple of minutes; leave generous headroom.
const DEFAULT_TIMEOUT_MS = 5 * 60_000

/** A job that ended with `status: failed` (the message is already readable). */
export class JobFailedError extends Error {}

/** The server no longer knows the job (it restarted, or the job expired): it has to be started again. */
export class JobLostError extends JobFailedError {
  constructor() {
    super('The analysis was lost (the server restarted). Run it again.')
  }
}

export interface JobProgress {
  stage: string | null // queued | query | download | stack | render | done
  progress: number // 0..1
  message: string | null
  etaSeconds: number | null
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

/**
 * Follows a job until it completes, polling at the pace the server suggests (`retry_after_ms`),
 * and returns its `result`. `poll` fetches the job's current state.
 */
export async function awaitJob<T>(
  first: JobResponse,
  poll: (jobId: string) => Promise<JobResponse>,
  opts: { signal: AbortSignal; onProgress?: (p: JobProgress) => void; timeoutMs?: number },
): Promise<T> {
  const deadline = Date.now() + (opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  let current = first
  for (;;) {
    if (current.status === 'completed' && current.result) return current.result as T
    if (current.status === 'failed') throw new JobFailedError(current.error ?? 'The SPHEREx job failed.')
    opts.onProgress?.({
      stage: current.stage ?? null,
      progress: current.progress ?? 0,
      message: current.message ?? null,
      etaSeconds: current.eta_s ?? null,
    })
    if (Date.now() > deadline) throw new Error('Timed out waiting for the SPHEREx job.')
    await sleep(current.retry_after_ms ?? DEFAULT_POLL_MS, opts.signal)
    try {
      current = await poll(current.job_id)
    } catch (e) {
      if (e instanceof ApiError && e.problem.code === 'job_not_found') throw new JobLostError()
      throw e
    }
  }
}
