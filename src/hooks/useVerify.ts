import { useState } from 'react'
import { verifyReport } from '../api/spherex'
import { describeReportError, loadVerified, saveVerified } from '../lib/reports'
import type { CitizenReport } from '../types/api'

/**
 * "I can see it too" confirmations. Which reports this browser already confirmed is remembered
 * locally; the backend has no accounts, so that is a courtesy guard, not a security measure.
 */
export function useVerify(onUpdated: (report: CitizenReport) => void) {
  const [verified, setVerified] = useState<Set<string>>(loadVerified)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const confirm = async (report: CitizenReport) => {
    setVerifying(report.id)
    setError(null)
    try {
      onUpdated(await verifyReport(report.id))
      const next = new Set(verified).add(report.id)
      setVerified(next)
      saveVerified(next)
    } catch (e) {
      setError(describeReportError(e))
    } finally {
      setVerifying(null)
    }
  }
  return { verified, verifying, error, confirm }
}
