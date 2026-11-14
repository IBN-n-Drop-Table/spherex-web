import type { SpectrumPoint } from '../types/api'

/** SPHEREx has 6 detector arrays; each covers a different slice of 0.75-5 um. */
export const DETECTOR_COLORS: Record<number, string> = {
  1: '#60a5fa',
  2: '#34d399',
  3: '#fbbf24',
  4: '#f97316',
  5: '#f472b6',
  6: '#a78bfa',
}
export const DETECTORS = [1, 2, 3, 4, 5, 6] as const
export const TOTAL_CHANNELS = 102

/**
 * Molecular windows, in micron. Mirrors CHEMICAL_WINDOWS_UM in spherex-api
 * (scripts/generate_golden_path.py), so the shading matches what the chemical filters show.
 */
export const CHEMICAL_WINDOWS_UM: Record<string, { color: string; ranges: [number, number][] }> = {
  H2O: { color: '#3b82f6', ranges: [[1.4, 1.9], [2.6, 2.8]] },
  CO2: { color: '#ef4444', ranges: [[4.2, 4.4]] },
  CO: { color: '#a855f7', ranges: [[4.6, 4.74]] },
}

/** One chart row: a wavelength, its flux in the series of its own detector, and a ±1 sigma band. */
export interface SpectrumRow {
  w: number
  flux: number
  sigma: number
  detector: number
  quality?: SpectrumPoint['quality']
  band: [number, number]
  [detectorKey: `d${number}`]: number | undefined
}

/** Sorted rows, one series per detector so the calibration jumps between detectors stay visible. */
export function buildRows(points: SpectrumPoint[]): SpectrumRow[] {
  return [...points]
    .sort((a, b) => a.wavelength_um - b.wavelength_um)
    .map(p => {
      const sigma = Math.sqrt(Math.max(p.variance, 0))
      const row: SpectrumRow = {
        w: p.wavelength_um,
        flux: p.flux_mjy_sr,
        sigma,
        detector: p.detector,
        quality: p.quality,
        band: [p.flux_mjy_sr - sigma, p.flux_mjy_sr + sigma],
      }
      row[`d${p.detector}`] = p.flux_mjy_sr // value only in its own detector's series
      return row
    })
}

/** Compact flux/error label shared by the charts (3 significant digits, none after 100). */
export const formatFlux = (v: number) =>
  Math.abs(v) >= 100 ? v.toFixed(0) : Number(v.toPrecision(3)).toString()
