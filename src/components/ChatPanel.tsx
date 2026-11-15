import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getChatSuggestions } from '../api/spherex'
import { MESSAGE_MAX, useChat } from '../hooks/useChat'
import ChatText from './ChatText'
import LoadingPhrase from './LoadingPhrase'
import { catalogAnswer, objectsNear, simbadPaused } from '../lib/simbad'
import type { ChatTone } from '../types/api'

interface Props {
  /** Key or name of the object on screen (gives the assistant its trusted facts), if it is one of the five. */
  targetKey: string | null
  /** What is on screen: layer, caveats... The server also reads science_note / quality / saturated / weak_signal from it. */
  context: Record<string, unknown>
  /** Centre of the view when it is NOT one of the five objects: the catalogue lookup is offered for it. */
  position?: { ra: number; dec: number }
  onClose: () => void
}

const TONES: { id: ChatTone; label: string; hint: string }[] = [
  { id: 'easy', label: 'Easy', hint: 'Plain words, no jargon' },
  { id: 'technical', label: 'Technical', hint: 'The terms astronomers use' },
]

// Fixed in the interface (the backend's own text is not in English yet).
const DISCLAIMER = 'AI assistant: it can be wrong. Findings need human verification.'

/** Chat that explains what is on screen. Answers always carry the server's caveats next to them. */
export default function ChatPanel({ targetKey, context, position, onClose }: Props) {
  const [tone, setTone] = useState<ChatTone>('easy')
  const [draft, setDraft] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const chat = useChat(context, tone)
  const [lookingUp, setLookingUp] = useState(false)
  const lastRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    getChatSuggestions(targetKey, ctrl.signal).then(r => setSuggestions(r.suggestions), () => undefined)
    return () => ctrl.abort()
  }, [targetKey])

  // Show the START of the newest message (an answer is read from its first line).
  useEffect(() => {
    lastRef.current?.scrollIntoView({ block: 'start' })
  }, [chat.messages.length])

  const blocked = chat.busy || chat.waitS > 0 || lookingUp
  const ask = (text: string) => {
    if (blocked) return
    void chat.send(text)
    setDraft('')
  }
  // Any other position: ask SIMBAD directly and list what is catalogued there. No AI is involved, so
  // nothing can be invented, and it works without keys.
  const askCatalog = async () => {
    if (!position || blocked) return
    if (simbadPaused()) return chat.setError('SIMBAD could not be reached a moment ago. Try again in a few minutes.')
    setLookingUp(true)
    chat.setError(null)
    try {
      const objects = await objectsNear(position.ra, position.dec)
      chat.addLocal('What is catalogued near the centre of this view?', catalogAnswer(objects), ['SIMBAD'])
    } catch {
      chat.setError('SIMBAD could not be reached. Try again in a few minutes.')
    } finally {
      setLookingUp(false)
    }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    ask(draft)
  }

  return (
    <div className="flex max-h-[calc(100vh-22rem)] min-h-[16rem] w-[26rem] max-w-[calc(100vw-1.5rem)] flex-col rounded bg-black/80 p-3 text-xs backdrop-blur">
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-slate-100">Ask about what you see</div>
          <div className="text-slate-400">{DISCLAIMER}</div>
        </div>
        <button onClick={onClose} aria-label="Close chat" className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700">
          ✕
        </button>
      </div>

      <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2">
        <span className="text-slate-400">Answer style:</span>
        {TONES.map(t => (
          <button
            key={t.id}
            onClick={() => setTone(t.id)}
            aria-pressed={tone === t.id}
            title={t.hint}
            className={`rounded px-2 py-1 ${tone === t.id ? 'bg-sky-600' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
        <span className="text-slate-500">{TONES.find(t => t.id === tone)?.hint}</span>
      </div>

      <div className="mt-2 flex shrink-0 gap-2">
        <button
          onClick={() => ask('Explain what I see in this view.')}
          disabled={blocked}
          className="flex-1 rounded bg-sky-700 px-3 py-1.5 text-sm hover:bg-sky-600 disabled:opacity-50"
        >
          Explain what I see
        </button>
        {targetKey && (
          // The server only adds catalogue (SIMBAD) facts for one of the five objects, so only then.
          <button
            onClick={() => ask('What else is near this object?')}
            disabled={blocked}
            title="Other catalogued objects around it, from SIMBAD"
            className="flex-1 rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600 disabled:opacity-50"
          >
            What else is near?
          </button>
        )}
        {!targetKey && position && (
          <button
            onClick={askCatalog}
            disabled={blocked}
            title="Objects SIMBAD lists around the centre of this view"
            className="flex-1 rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600 disabled:opacity-50"
          >
            {lookingUp ? 'Asking SIMBAD…' : 'What is catalogued here?'}
          </button>
        )}
      </div>

      {chat.messages.length === 0 && suggestions.length > 0 && (
        <div className="mt-2 flex min-h-0 flex-wrap gap-1 overflow-y-auto">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={blocked}
              className="rounded-full border border-slate-600 px-2 py-1 text-left text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {chat.messages.length > 0 && (
        <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" aria-live="polite">
          {chat.messages.map((m, i) =>
            m.role === 'user' ? (
              <p key={m.id} ref={i === chat.messages.length - 1 ? lastRef : undefined} className="ml-8 rounded bg-slate-800 px-2 py-1 text-slate-100">
                {m.text}
              </p>
            ) : (
              <div key={m.id} ref={i === chat.messages.length - 1 ? lastRef : undefined} className="mr-4 space-y-1">
                <div className="rounded bg-slate-900 px-2 py-1 text-slate-200">
                  <ChatText text={m.text} />
                </div>
                {m.reply?.sources && m.reply.sources.length > 0 && (
                  <p className="text-[11px] text-slate-400">
                    Source: {m.reply.sources.join(', ')} · catalogue entries, not SPHEREx detections.
                  </p>
                )}
                {m.reply?.fallback && (
                  <p className="text-[11px] text-slate-500">Pre-written answer, not generated by the AI.</p>
                )}
                {m.reply && m.reply.cautions.length > 0 && (
                  <ul className="space-y-0.5 rounded bg-amber-900/60 px-2 py-1 text-[11px] text-amber-200">
                    {m.reply.cautions.map(c => (
                      <li key={c}>⚠ {c}</li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          )}
          {chat.busy && <LoadingPhrase category="chat" className="text-xs" />}
        </div>
      )}

      {chat.error && (
        <p className="mt-2 shrink-0 rounded border border-rose-900 px-2 py-1 text-rose-200">
          {chat.error}
          {chat.waitS > 0 ? ` Wait ${chat.waitS} s and try again.` : ''}
        </p>
      )}

      <form onSubmit={submit} className="mt-2 flex shrink-0 gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          maxLength={MESSAGE_MAX}
          placeholder="Ask a question…"
          aria-label="Your question"
          className="min-w-0 flex-1 rounded bg-slate-900 px-2 py-1.5 text-slate-100 outline-none ring-sky-600 focus:ring-1"
        />
        <button
          type="submit"
          disabled={blocked || !draft.trim()}
          className="rounded bg-sky-600 px-3 py-1.5 hover:bg-sky-500 disabled:opacity-50"
        >
          {chat.waitS > 0 ? `${chat.waitS}s` : 'Send'}
        </button>
      </form>
    </div>
  )
}
