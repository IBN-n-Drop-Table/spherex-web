import { useCallback, useEffect, useRef, useState } from 'react'
import { askChat } from '../api/spherex'
import { ApiError } from '../api/http'
import type { ChatResponse, ChatTone } from '../types/api'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  /** Assistant only: the server's flags and the caveats that must stay next to the answer. */
  reply?: Pick<ChatResponse, 'fallback' | 'cached' | 'provider' | 'cautions'>
}

const HISTORY_TURNS = 6
const DEFAULT_WAIT_S = 10
export const MESSAGE_MAX = 500

function describe(e: unknown): string {
  if (e instanceof ApiError && e.status === 422) return e.problem.detail ?? 'That question was not accepted.'
  return 'The assistant could not be reached. Try again in a moment.'
}

/** Conversation state: sends the question with the on-screen context, keeps the thread, obeys 429. */
export function useChat(context: Record<string, unknown>, tone: ChatTone) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [waitS, setWaitS] = useState(0) // > 0: rate limited, sending is disabled
  const nextId = useRef(1)
  const ctrl = useRef<AbortController | null>(null)
  const latest = useRef({ messages, context, tone })
  useEffect(() => {
    latest.current = { messages, context, tone }
  })
  useEffect(() => () => ctrl.current?.abort(), [])

  // Count a 429 down once a second; never retry on its own.
  useEffect(() => {
    if (waitS <= 0) return
    const t = setTimeout(() => setWaitS(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [waitS])

  const send = useCallback(async (raw: string) => {
    const text = raw.trim().slice(0, MESSAGE_MAX)
    if (!text) return
    const { messages: before, context: ctx, tone: t } = latest.current
    setError(null)
    setBusy(true)
    setMessages(m => [...m, { id: nextId.current++, role: 'user', text }])
    ctrl.current?.abort()
    const c = (ctrl.current = new AbortController())
    try {
      const r = await askChat(
        {
          message: text,
          tone: t,
          context: ctx,
          history: before.slice(-HISTORY_TURNS).map(m => ({ role: m.role, content: m.text })),
        },
        c.signal,
      )
      setMessages(m => [
        ...m,
        { id: nextId.current++, role: 'assistant', text: r.answer, reply: { fallback: r.fallback, cached: r.cached, provider: r.provider, cautions: r.cautions } },
      ])
    } catch (e) {
      if (c.signal.aborted) return
      if (e instanceof ApiError && e.status === 429) {
        setWaitS(Math.ceil(e.retryAfterS ?? DEFAULT_WAIT_S))
        setError('Too many questions in a short time.')
      } else {
        setError(describe(e))
      }
    } finally {
      if (!c.signal.aborted) setBusy(false)
    }
  }, [])

  return { messages, busy, error, waitS, send }
}
