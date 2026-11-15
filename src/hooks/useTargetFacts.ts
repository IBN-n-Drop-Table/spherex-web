import { useEffect, useState } from 'react'
import { listTargets } from '../api/spherex'
import type { TargetSummary } from '../types/api'

// One request for the whole session: the list never changes while the app is open.
let cached: TargetSummary[] | null = null
let pending: Promise<TargetSummary[]> | null = null

/** The challenge objects with their distances; empty until loaded (or if the server is down). */
export function useTargetFacts(): TargetSummary[] {
  const [list, setList] = useState<TargetSummary[]>(cached ?? [])
  useEffect(() => {
    if (cached) return
    pending ??= listTargets().then(
      r => (cached = r),
      () => {
        pending = null // try again next time
        return []
      },
    )
    let alive = true
    pending.then(r => alive && setList(r))
    return () => {
      alive = false
    }
  }, [])
  return list
}
