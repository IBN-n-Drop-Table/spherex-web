import { useEffect, useState } from 'react'
import { getLoadingPhrases } from '../api/spherex'
import { LOCAL_PHRASES, type LoadingPhrases } from '../lib/loadingPhrases'

// One request per session. Until it answers (or if it never does) the local copy is used.
let fromServer: LoadingPhrases | null = null
let pending: Promise<void> | null = null

function load(): Promise<void> {
  pending ??= getLoadingPhrases().then(
    r => {
      const merged = { ...LOCAL_PHRASES }
      for (const k of Object.keys(merged) as (keyof LoadingPhrases)[]) {
        const list = r.phrases[k]
        if (Array.isArray(list) && list.length > 0) merged[k] = list
      }
      fromServer = merged
    },
    () => {
      pending = null // try again the next time something loads
    },
  )
  return pending
}

/** The waiting-screen phrases: the server's list when it has answered, else the built-in copy. */
export function useLoadingPhrases(): LoadingPhrases {
  const [phrases, setPhrases] = useState<LoadingPhrases>(fromServer ?? LOCAL_PHRASES)
  useEffect(() => {
    if (fromServer) return
    let alive = true
    load().then(() => alive && fromServer && setPhrases(fromServer))
    return () => {
      alive = false
    }
  }, [])
  return phrases
}
