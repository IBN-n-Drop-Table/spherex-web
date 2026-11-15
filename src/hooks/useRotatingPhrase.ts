import { useEffect, useState } from 'react'
import type { PhraseCategory } from '../lib/loadingPhrases'
import { useLoadingPhrases } from './useLoadingPhrases'

const ROTATE_MS = 4500
const COLD_START_AFTER_MS = 3000

const pick = (list: string[], not?: string) => {
  const pool = list.length > 1 ? list.filter(p => p !== not) : list
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * A random phrase of `category`, changed every ~4.5 s. If the wait passes ~3 s on a normal
 * (generic) screen the server is probably waking up, so the "cold start" phrases take over.
 */
export function useRotatingPhrase(category: PhraseCategory): string {
  const all = useLoadingPhrases()
  const [slow, setSlow] = useState(false)
  // The pick belongs to the list it came from: a new category starts again from that list's first phrase.
  const [chosen, setChosen] = useState<{ list: string[]; text: string } | null>(null)
  const effective: PhraseCategory = slow && category === 'generic' ? 'cold_start' : category
  const list = all[effective]

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), COLD_START_AFTER_MS)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    const t = setInterval(
      () => setChosen(prev => ({ list, text: pick(list, prev?.list === list ? prev.text : list[0]) })), // never repeat the one on screen
      ROTATE_MS,
    )
    return () => clearInterval(t)
  }, [list])

  return chosen?.list === list ? chosen.text : list[0]
}
