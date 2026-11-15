import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getChatSuggestions } from '../api/spherex'
import { MESSAGE_MAX, useChat } from '../hooks/useChat'
import ChatText from './ChatText'
import LoadingPhrase from './LoadingPhrase'
import { catalogAnswer, objectsNear, simbadPaused } from '../lib/simbad'
import type { ChatTone } from '../types/api'
import { Button, Callout, Chip, Panel, Segmented, type DockControls } from './ui'
import { fieldClass } from './classes'

interface Props {
  /** Key or name of the object on screen (gives the assistant its trusted facts), if it is one of the five. */
  targetKey: string | null
  /** What is on screen: layer, caveats... The server also reads science_note / quality / saturated / weak_signal from it. */
  context: Record<string, unknown>
  /** Centre of the view when it is NOT one of the five objects: the catalogue lookup is offered for it. */
  position?: { ra: number; dec: number }
  dock: DockControls
}

const TONES: { id: ChatTone; label: string; hint: string }[] = [
  { id: 'easy', label: 'Easy', hint: 'Plain words, no jargon' },
  { id: 'technical', label: 'Technical', hint: 'The terms astronomers use' },
]

// Fixed in the interface: always on screen while the chat is open.
const DISCLAIMER = 'AI assistant: it can be wrong. Findings need human verification.'

/** Chat that explains what is on screen. Answers always carry the server's caveats next to them. */
export default function ChatPanel({ targetKey, context, position, dock }: Props) {
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
    <Panel title="Ask about what you see" className="h-full" flush {...dock}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 space-y-3 border-b border-rule p-4">
          <Callout tone="caution">{DISCLAIMER}</Callout>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="text-muted">Answer style</span>
            <Segmented label="Answer style" value={tone} onChange={setTone} options={TONES.map(t => ({ id: t.id, label: t.label, title: t.hint }))} />
            <span className="text-faint">{TONES.find(t => t.id === tone)?.hint}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => ask('Explain what I see in this view.')} disabled={blocked} className="flex-1">
              Explain what I see
            </Button>
            {targetKey && (
              // The server only adds catalogue (SIMBAD) facts for one of the five objects, so only then.
              <Button onClick={() => ask('What else is near this object?')} disabled={blocked} title="Other catalogued objects around it, from SIMBAD" className="flex-1">
                What else is near?
              </Button>
            )}
            {!targetKey && position && (
              <Button onClick={askCatalog} disabled={blocked} title="Objects SIMBAD lists around the centre of this view" className="flex-1">
                {lookingUp ? 'Asking SIMBAD…' : 'What is catalogued here?'}
              </Button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {chat.messages.length === 0 && (
            <div className="space-y-2">
              <p className="font-display text-sm italic text-muted">Not sure what to ask? Try one of these.</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map(s => (
                  <Chip key={s} onClick={() => ask(s)} disabled={blocked}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {chat.messages.map((m, i) =>
            m.role === 'user' ? (
              <p key={m.id} ref={i === chat.messages.length - 1 ? lastRef : undefined} className="ml-8 border border-rule-strong bg-raised px-3 py-2 text-sm text-paper">
                {m.text}
              </p>
            ) : (
              <div key={m.id} ref={i === chat.messages.length - 1 ? lastRef : undefined} className="space-y-2">
                <div className="border-l border-rule-strong pl-3 text-sm leading-relaxed text-paper">
                  <ChatText text={m.text} />
                </div>
                {m.reply?.sources && m.reply.sources.length > 0 && (
                  <p className="pl-3 text-2xs text-muted">Source: {m.reply.sources.join(', ')} · catalogue entries, not SPHEREx detections.</p>
                )}
                {m.reply?.fallback && <p className="pl-3 text-2xs text-faint">Pre-written answer, not generated by the AI.</p>}
                {m.reply && m.reply.cautions.length > 0 && (
                  <Callout tone="caution">
                    <ul className="space-y-1">
                      {m.reply.cautions.map(c => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </Callout>
                )}
              </div>
            ),
          )}
          {chat.busy && <LoadingPhrase category="chat" />}
        </div>

        {chat.error && (
          <div className="shrink-0 px-3 pb-2">
            <Callout tone="error" live>
              {chat.error}
              {chat.waitS > 0 ? ` Wait ${chat.waitS} s and try again.` : ''}
            </Callout>
          </div>
        )}

        <form onSubmit={submit} className="flex shrink-0 gap-2 border-t border-rule p-3">
          <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={MESSAGE_MAX} placeholder="Ask a question…" aria-label="Your question" className={`${fieldClass} min-w-0 flex-1`} />
          <Button type="submit" variant="primary" disabled={blocked || !draft.trim()}>
            {chat.waitS > 0 ? `${chat.waitS} s` : 'Send'}
          </Button>
        </form>
      </div>
    </Panel>
  )
}
