import { useEffect, useState } from 'react'
import { COLD_START_PHRASE } from '../lib/loadingPhrases'

const ROTATE_MS = 4500
const COLD_START_AFTER_MS = 3000

/** Cycles through `phrases` while mounted; says the server is waking up if it takes over ~3 s. */
export function useRotatingPhrase(phrases: string[]): string {
  const [tick, setTick] = useState(0)
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const slowTimer = setTimeout(() => setSlow(true), COLD_START_AFTER_MS)
    const timer = setInterval(() => setTick(t => t + 1), ROTATE_MS)
    return () => {
      clearTimeout(slowTimer)
      clearInterval(timer)
    }
  }, [])
  const all = slow ? [COLD_START_PHRASE, ...phrases] : phrases
  return all[tick % all.length]
}
