import { useCallback, useEffect, useState } from 'react'
import { listReports } from '../api/spherex'
import { describeReportError } from '../lib/reports'
import type { CitizenReport } from '../types/api'

interface Settled {
  key: string
  reports: CitizenReport[]
  error: string | null
}

export interface ReportsState {
  reports: CitizenReport[]
  loading: boolean
  error: string | null
  reload: () => void
  /** Swap in an updated report (e.g. after a verification) without refetching. */
  replace: (report: CitizenReport) => void
}

/**
 * Community feed for one target (or every target when `targetName` is null). Nothing is fetched
 * while `enabled` is false, so a closed panel costs no request.
 */
export function useReports(
  targetName: string | null,
  { enabled = true, limit = 30 }: { enabled?: boolean; limit?: number } = {},
): ReportsState {
  const [reloadToken, setReloadToken] = useState(0)
  const key = enabled ? `${targetName ?? '*'}|${limit}|${reloadToken}` : null
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    if (key === null) return
    const ctrl = new AbortController()
    listReports({ ...(targetName ? { target_name: targetName } : {}), limit }, ctrl.signal)
      .then(reports => setSettled({ key, reports, error: null }))
      .catch(e => {
        if (!ctrl.signal.aborted) setSettled({ key, reports: [], error: describeReportError(e) })
      })
    return () => ctrl.abort()
  }, [key, targetName, limit])

  const reload = useCallback(() => setReloadToken(t => t + 1), [])
  const replace = useCallback((report: CitizenReport) => {
    setSettled(prev =>
      prev ? { ...prev, reports: prev.reports.map(r => (r.id === report.id ? report : r)) } : prev,
    )
  }, [])

  const loading = key !== null && settled?.key !== key
  return {
    reports: key !== null && settled?.key === key ? settled.reports : (settled?.reports ?? []),
    loading,
    error: loading ? null : (settled?.error ?? null),
    reload,
    replace,
  }
}
