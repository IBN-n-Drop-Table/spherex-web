import { getJson, getJsonWithStatus, postJson } from './http'
import type {
  CitizenReport,
  CitizenReportCreate,
  Classification,
  ChatRequest,
  ChatResponse,
  ChatSuggestions,
  CreditsResponse,
  FinishResult,
  GameSession,
  GuessResult,
  Leaderboard,
  TargetSummary,
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

/** Ask the assistant. The server never answers 5xx: without AI it sends a pre-written answer (`fallback`). */
export function askChat(body: ChatRequest, signal?: AbortSignal) {
  return postJson<ChatResponse>('/api/v1/chat', body, { signal, timeoutMs: 45_000 })
}

/** Four starter questions for a target (key or name), or the generic list. */
export function getChatSuggestions(target?: string | null, signal?: AbortSignal) {
  return getJson<ChatSuggestions>('/api/v1/chat/suggestions', { target: target ?? undefined }, { signal })
}

/** Start a game of 3-5 rounds (easy to hard). Only Barnard's Star and Epsilon Indi B are used. */
export function startGame(rounds: number, signal?: AbortSignal) {
  return postJson<GameSession>('/api/v1/game/sessions', { rounds }, { signal })
}

/** One attempt per round. `x`, `y` are in the round image's own pixels, origin top left. */
export function guessRound(
  body: { session_id: string; round_id: string; x: number; y: number; time_ms: number },
  signal?: AbortSignal,
) {
  return postJson<GuessResult>('/api/v1/game/guess', body, { signal })
}

/** Saves the score (the server adds up the rounds itself: the client never sends one). */
export function finishGame(body: { session_id: string; nickname: string }, signal?: AbortSignal) {
  return postJson<FinishResult>('/api/v1/game/finish', body, { signal })
}

export function getLeaderboard(signal?: AbortSignal) {
  return getJson<Leaderboard>('/api/v1/game/leaderboard', {}, { signal })
}

/** The challenge objects with their distances. */
export function listTargets(signal?: AbortSignal) {
  return getJson<TargetSummary[]>('/api/v1/targets', {}, { signal })
}

/** What data the app uses and how to cite it (shown in the credits). */
export function getCredits(signal?: AbortSignal) {
  return getJson<CreditsResponse>('/api/v1/credits', {}, { signal })
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
