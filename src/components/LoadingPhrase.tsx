import { useRotatingPhrase } from '../hooks/useRotatingPhrase'
import type { PhraseCategory } from '../lib/loadingPhrases'

/** One ambience line for a waiting screen (changes every few seconds). Never a status message. */
export default function LoadingPhrase({ category, className = '' }: { category: PhraseCategory; className?: string }) {
  const phrase = useRotatingPhrase(category)
  return <p className={`text-[11px] italic text-slate-500 ${className}`}>{phrase}</p>
}
