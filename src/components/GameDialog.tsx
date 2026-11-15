import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { finishGame, getLeaderboard, guessRound, startGame } from '../api/spherex'
import { BLINK_MS, DIFFICULTY_LABEL, GAME_ROUNDS, NICKNAME_HINT, NICKNAME_RE, describeGameError, type GameFailure } from '../lib/game'
import { loadHandle, saveHandle } from '../lib/reports'
import type { FinishResult, GamePoint, GameRound, GameSession, GuessResult, Leaderboard } from '../types/api'
import HunterCardDialog from './HunterCardDialog'
import LoadingPhrase from './LoadingPhrase'

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })

/** Counts a 429's wait down once a second. */
function useCountdown(initial: number | null): [number, (s: number | null) => void] {
  const [left, setLeft] = useState(initial ?? 0)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return [left, s => setLeft(s ?? 0)]
}

function Failure({ f, waitS }: { f: GameFailure; waitS: number }) {
  return (
    <p className="rounded border border-rose-900 px-3 py-2 text-rose-200">
      {f.text}
      {waitS > 0 ? ` Wait ${waitS} s and try again.` : ''}
    </p>
  )
}

/** One round: the two visits flicker; click where something moved, then submit. */
function RoundView({ round, sessionId, index, total, last, onDone, onSkip, onLost }: {
  round: GameRound
  sessionId: string
  index: number
  total: number
  last: boolean
  onDone: (r: GuessResult, mark: GamePoint) => void
  /** The server already had an answer for this round: move on without a result to show. */
  onSkip: () => void
  onLost: (f: GameFailure) => void
}) {
  const { width, height } = round.image_size
  const [later, setLater] = useState(false)
  const [hint, setHint] = useState(false)
  const [mark, setMark] = useState<GamePoint | null>(null)
  const [elapsedS, setElapsedS] = useState(0)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<GameFailure | null>(null)
  const [waitS, setWait] = useCountdown(null)
  const stuck = failure?.conflict === true // 409: sending again can never work, so offer to continue
  const startedAt = useRef(0)

  // Load every image before it is needed, so the flicker has no gaps.
  useEffect(() => {
    for (const u of [round.image_a_url, round.image_b_url, round.hint_image_url]) if (u) new Image().src = u
    startedAt.current = performance.now()
    const tick = setInterval(() => setElapsedS(Math.floor((performance.now() - startedAt.current) / 1000)), 250)
    return () => clearInterval(tick)
  }, [round])
  useEffect(() => {
    if (hint) return
    const t = setInterval(() => setLater(v => !v), BLINK_MS)
    return () => clearInterval(t)
  }, [hint])

  const place = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setMark({ x: ((e.clientX - r.left) * width) / r.width, y: ((e.clientY - r.top) * height) / r.height })
  }
  const submit = async () => {
    if (!mark || busy || waitS > 0) return
    setBusy(true)
    setFailure(null)
    try {
      const res = await guessRound({ session_id: sessionId, round_id: round.round_id, x: mark.x, y: mark.y, time_ms: Math.round(performance.now() - startedAt.current) })
      onDone(res, mark)
    } catch (e) {
      const f = describeGameError(e)
      if (f.lost) return onLost(f)
      setFailure(f)
      setWait(f.waitS)
      setBusy(false)
    }
  }

  const src = hint && round.hint_image_url ? round.hint_image_url : later ? round.image_a_url : round.image_b_url
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="font-medium">Round {index + 1} of {total}</span>{' '}
          <span className="text-slate-400">· {DIFFICULTY_LABEL[round.difficulty]} · {round.target_name}</span>
        </div>
        <span className="tabular-nums text-slate-400">{elapsedS} s</span>
      </div>
      {round.weak_signal && (
        <p className="rounded bg-amber-900/60 px-2 py-1 text-xs text-amber-200">
          Weak signal: the movement is smaller than one SPHEREx pixel, so it is subtle.{' '}
          {round.hint_image_url ? 'Use the hint if you get stuck.' : ''}
        </p>
      )}
      <div
        className="relative mx-auto aspect-square w-[min(100%,58vh)] cursor-crosshair overflow-hidden rounded bg-black"
        onClick={place}
        role="img"
        aria-label="Two flickering images of the same sky: click where something moved"
      >
        <img src={src} alt="" draggable={false} className="h-full w-full select-none [image-rendering:pixelated]" />
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[11px]">
          {hint ? 'Hint: red = brighter later, blue = brighter earlier' : later ? `Later visit · ${fmtDate(round.date_a)}` : `Earlier visit · ${fmtDate(round.date_b)}`}
        </span>
        {mark && (
          <svg viewBox={`0 0 ${width} ${height}`} className="pointer-events-none absolute inset-0 h-full w-full">
            <circle cx={mark.x} cy={mark.y} r={9} fill="none" stroke="#fff" strokeWidth={1.5} />
            <path d={`M${mark.x - 14} ${mark.y}H${mark.x + 14}M${mark.x} ${mark.y - 14}V${mark.y + 14}`} stroke="#fff" strokeWidth={1} />
          </svg>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {round.hint_image_url && (
          <button onClick={() => setHint(h => !h)} aria-pressed={hint} className="rounded bg-slate-700 px-3 py-1.5 hover:bg-slate-600">
            {hint ? 'Back to flicker' : 'Show hint'}
          </button>
        )}
        {stuck ? (
          <button onClick={onSkip} className="rounded bg-sky-600 px-4 py-1.5 hover:bg-sky-500">
            {last ? 'See my score' : 'Next round'}
          </button>
        ) : (
          <button onClick={submit} disabled={!mark || busy || waitS > 0} className="rounded bg-sky-600 px-4 py-1.5 hover:bg-sky-500 disabled:opacity-50">
            {busy ? 'Checking…' : waitS > 0 ? `${waitS}s` : 'Submit answer'}
          </button>
        )}
        <span className="text-xs text-slate-500">{mark ? 'Click again to move your mark.' : 'Click where you think it moved.'}</span>
      </div>
      {failure && <Failure f={failure} waitS={waitS} />}
    </div>
  )
}

/** After the answer: the real path of the object over your mark. */
function ResultView({ round, result, mark, last, onNext }: { round: GameRound; result: GuessResult; mark: GamePoint; last: boolean; onNext: () => void }) {
  const { width, height } = round.image_size
  const [from, to] = [result.answer_path[0], result.answer_path.at(-1)]
  return (
    <div className="space-y-3">
      <div className={`text-base font-medium ${result.hit ? 'text-emerald-300' : 'text-rose-300'}`}>
        {result.hit ? 'You found it!' : 'Not this time.'} <span className="text-slate-300">+{result.score} points</span>
      </div>
      <div className="relative mx-auto aspect-square w-[min(100%,52vh)] overflow-hidden rounded bg-black">
        <img src={round.image_a_url} alt="" className="h-full w-full [image-rendering:pixelated]" />
        <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 h-full w-full">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="#fbbf24" />
            </marker>
          </defs>
          {from && to && <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#fbbf24" strokeWidth={2} markerEnd="url(#arrow)" />}
          {from && <circle cx={from.x} cy={from.y} r={5} fill="none" stroke="#60a5fa" strokeWidth={2} />}
          {to && <circle cx={to.x} cy={to.y} r={5} fill="none" stroke="#f87171" strokeWidth={2} />}
          <circle cx={mark.x} cy={mark.y} r={9} fill="none" stroke="#fff" strokeWidth={1.5} />
        </svg>
      </div>
      <p className="text-xs text-slate-400">
        <span className="text-blue-400">blue ring</span> where it was · <span className="text-red-400">red ring</span> where it is · white circle: your mark ·{' '}
        {Math.round(result.distance_px)} px away
      </p>
      <details className="text-xs text-slate-300">
        <summary className="cursor-pointer text-slate-400">What happened?</summary>
        <p className="mt-1">{result.explanation_es}</p>
      </details>
      <button onClick={onNext} className="rounded bg-sky-600 px-4 py-1.5 hover:bg-sky-500">
        {last ? 'See my score' : 'Next round'}
      </button>
    </div>
  )
}

function Board({ board, mine }: { board: Leaderboard; mine?: string }) {
  if (board.entries.length === 0) return <p className="text-slate-400">No scores yet. Be the first.</p>
  return (
    <div>
      <ol className="space-y-0.5">
        {board.entries.map((e, i) => (
          <li key={`${e.nickname}-${e.created_at}`} className={`flex justify-between rounded px-2 py-1 ${e.nickname === mine ? 'bg-sky-900/60' : 'bg-slate-800/60'}`}>
            <span>{i + 1}. {e.nickname}</span>
            <span className="tabular-nums">{e.score} <span className="text-slate-500">· {e.hits} found</span></span>
          </li>
        ))}
      </ol>
      {board.backend === 'memory' && <p className="mt-1 text-[11px] text-slate-500">These scores live in the server's memory: they reset when it restarts.</p>}
    </div>
  )
}

type Stage = 'intro' | 'round' | 'result' | 'summary' | 'saved'

/** "Find what moves": a short game on real SPHEREx images. The server owns the answers and the score. */
export default function GameDialog({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<Stage>('intro')
  const [roundsWanted, setRoundsWanted] = useState(3)
  const [session, setSession] = useState<GameSession | null>(null)
  const [index, setIndex] = useState(0)
  // One slot per round. A slot stays empty when the server already had that round's answer (a 409).
  const [results, setResults] = useState<({ result: GuessResult; mark: GamePoint } | undefined)[]>([])
  const [starting, setStarting] = useState(false)
  const [failure, setFailure] = useState<GameFailure | null>(null)
  const [waitS, setWait] = useCountdown(null)
  const [nickname, setNickname] = useState(() => (NICKNAME_RE.test(loadHandle()) ? loadHandle() : ''))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<FinishResult | null>(null)
  const [board, setBoard] = useState<Leaderboard | null>(null)
  const [showBoard, setShowBoard] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !cardOpen && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, cardOpen])

  useEffect(() => {
    if (!showBoard && stage !== 'saved') return
    const ctrl = new AbortController()
    getLeaderboard(ctrl.signal).then(setBoard, () => undefined)
    return () => ctrl.abort()
  }, [showBoard, stage])

  const fail = (e: unknown) => {
    const f = describeGameError(e)
    setFailure(f)
    setWait(f.waitS)
    return f
  }
  const reset = (to: Stage = 'intro') => {
    setSession(null)
    setResults([])
    setIndex(0)
    setSaved(null)
    setStage(to)
  }
  const begin = async () => {
    if (starting || waitS > 0) return
    setStarting(true)
    setFailure(null)
    try {
      const s = await startGame(roundsWanted)
      setSession(s)
      setResults([])
      setIndex(0)
      setSaved(null)
      setStage('round')
    } catch (e) {
      fail(e)
    } finally {
      setStarting(false)
    }
  }
  const save = async () => {
    if (!session || saving || waitS > 0 || !NICKNAME_RE.test(nickname)) return
    setSaving(true)
    setFailure(null)
    try {
      const r = await finishGame({ session_id: session.session_id, nickname })
      saveHandle(nickname)
      setSaved(r)
      setStage('saved')
    } catch (e) {
      const f = fail(e)
      if (f.lost) reset()
    } finally {
      setSaving(false)
    }
  }

  const round = session?.rounds[index]
  const total = results.reduce((sum, r) => sum + (r?.result.score ?? 0), 0)

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Find what moves">
      <div className="max-h-[94vh] w-[min(94vw,640px)] space-y-3 overflow-y-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">Find what moves</h2>
          <button onClick={onClose} aria-label="Close" className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700">
            ✕
          </button>
        </div>

        {stage === 'intro' && (
          <div className="space-y-3">
            <p className="text-slate-300">
              Two images of the same patch of sky, taken months apart, flicker back and forth. Something moved a little between them. Click where you think it is,
              then submit. The closer and the faster you are, the more points: up to 1000 per round.
            </p>
            <p className="text-xs text-slate-400">In some rounds the movement is smaller than one SPHEREx pixel: those have a hint button.</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400">Rounds:</span>
              {GAME_ROUNDS.map(n => (
                <button key={n} onClick={() => setRoundsWanted(n)} aria-pressed={roundsWanted === n} className={`rounded px-3 py-1 ${roundsWanted === n ? 'bg-sky-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
                  {n}
                </button>
              ))}
              <button onClick={begin} disabled={starting || waitS > 0} className="ml-auto rounded bg-sky-600 px-4 py-1.5 hover:bg-sky-500 disabled:opacity-50">
                {starting ? 'Starting…' : waitS > 0 ? `${waitS}s` : 'Start'}
              </button>
            </div>
            {starting && <LoadingPhrase category="game" />}
            {failure && <Failure f={failure} waitS={waitS} />}
            <button onClick={() => setShowBoard(s => !s)} aria-expanded={showBoard} className="text-xs text-slate-400 underline">
              {showBoard ? 'Hide the leaderboard' : 'See the leaderboard'}
            </button>
            {showBoard && (board ? <Board board={board} /> : <p className="text-slate-500">Loading…</p>)}
          </div>
        )}

        {stage === 'round' && session && round && (
          <RoundView
            key={round.round_id}
            round={round}
            sessionId={session.session_id}
            index={index}
            total={session.rounds.length}
            last={index + 1 >= session.rounds.length}
            onDone={(result, mark) => {
              setResults(r => {
                const next = [...r]
                next[index] = { result, mark }
                return next
              })
              setStage('result')
            }}
            onSkip={() => {
              if (index + 1 >= session.rounds.length) setStage('summary')
              else {
                setIndex(i => i + 1)
                setStage('round')
              }
            }}
            onLost={f => {
              reset()
              setFailure(f)
            }}
          />
        )}

        {stage === 'result' && session && round && results[index] && (
          <ResultView
            round={round}
            result={results[index].result}
            mark={results[index].mark}
            last={index + 1 >= session.rounds.length}
            onNext={() => {
              if (index + 1 >= session.rounds.length) setStage('summary')
              else {
                setIndex(i => i + 1)
                setStage('round')
              }
            }}
          />
        )}

        {stage === 'summary' && session && (
          <div className="space-y-3">
            <div className="text-base font-medium">Your score: <span className="text-amber-300">{total}</span> points</div>
            <ul className="space-y-0.5 text-xs">
              {session.rounds.map((r, i) => (
                <li key={r.round_id} className="flex justify-between rounded bg-slate-800/60 px-2 py-1">
                  <span>Round {i + 1} · {DIFFICULTY_LABEL[r.difficulty]} · {r.target_name}</span>
                  <span>{results[i] ? `${results[i].result.hit ? 'found' : 'missed'} · ${results[i].result.score}` : 'answered, result not shown'}</span>
                </li>
              ))}
            </ul>
            <label className="block space-y-1">
              <span className="text-slate-300">Your name for the leaderboard</span>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={16}
                aria-label="Nickname"
                className="w-full rounded bg-slate-950 px-2 py-1.5 outline-none ring-sky-600 focus:ring-1"
              />
              <span className={`text-xs ${nickname && !NICKNAME_RE.test(nickname) ? 'text-amber-300' : 'text-slate-500'}`}>{NICKNAME_HINT}</span>
            </label>
            {failure && <Failure f={failure} waitS={waitS} />}
            <div className="flex flex-wrap gap-2">
              <button onClick={save} disabled={saving || waitS > 0 || !NICKNAME_RE.test(nickname)} className="rounded bg-sky-600 px-4 py-1.5 hover:bg-sky-500 disabled:opacity-50">
                {saving ? 'Saving…' : waitS > 0 ? `${waitS}s` : 'Save my score'}
              </button>
              <button onClick={() => reset()} className="rounded bg-slate-700 px-4 py-1.5 hover:bg-slate-600">
                Play again without saving
              </button>
            </div>
          </div>
        )}

        {stage === 'saved' && saved && (
          <div className="space-y-3">
            <div className="text-base font-medium">
              {saved.nickname}: <span className="text-amber-300">{saved.score}</span> points · {saved.hits} found
              {saved.rounds_played < saved.rounds_total ? ` · ${saved.rounds_played} of ${saved.rounds_total} rounds played` : ''}
            </div>
            {board ? <Board board={board} mine={saved.nickname} /> : <p className="text-slate-500">Loading the leaderboard…</p>}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCardOpen(true)} className="rounded bg-sky-600 px-4 py-1.5 hover:bg-sky-500">
                Make my Star hunter card
              </button>
              <button onClick={() => reset()} className="rounded bg-slate-700 px-4 py-1.5 hover:bg-slate-600">
                Play again
              </button>
            </div>
          </div>
        )}
      </div>
      {cardOpen && saved && <HunterCardDialog result={saved} onClose={() => setCardOpen(false)} />}
    </div>,
    document.body,
  )
}
