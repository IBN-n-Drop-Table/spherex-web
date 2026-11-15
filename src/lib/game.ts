import { ApiError } from '../api/http'

export const NICKNAME_RE = /^[\p{L}\p{N}_-]{3,16}$/u
export const NICKNAME_HINT = '3-16 characters: letters, digits, _ or -'
export const GAME_ROUNDS = [3, 4, 5]
/** How long each of the two images stays on screen while they flicker. */
export const BLINK_MS = 700

export interface GameFailure {
  text: string
  /** Rate limited: seconds to wait (from `Retry-After`). */
  waitS: number | null
  /** The session is gone (expired, or the server restarted): a new game is needed. */
  lost: boolean
  /** 409: the server already has an answer for this round (a repeated send) or the game is over. */
  conflict: boolean
}

/** What to tell the player when a game request fails. Never retries on its own. */
export function describeGameError(e: unknown): GameFailure {
  if (e instanceof ApiError) {
    if (e.status === 404 || e.status === 410) {
      return { text: 'This game has expired, or the server restarted. Start a new one.', waitS: null, lost: true, conflict: false }
    }
    if (e.status === 429) return { text: 'Too many requests in a short time.', waitS: Math.ceil(e.retryAfterS ?? 10), lost: false, conflict: false }
    if (e.status === 409 || e.status === 422) {
      return { text: e.problem.detail ?? 'The server did not accept that.', waitS: null, lost: false, conflict: e.status === 409 }
    }
  }
  return { text: 'Could not reach the game server. Try again in a moment.', waitS: null, lost: false, conflict: false }
}

export const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const
