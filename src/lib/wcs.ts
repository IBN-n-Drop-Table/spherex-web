import type { Patch } from '../types/api'

const RAD = Math.PI / 180

/**
 * Image position -> sky, for the patch images (TAN projection, North up, East left).
 *
 * `x`, `y` are CONTINUOUS image coordinates in pixels, x to the right and y DOWN, where pixel `i`
 * spans [i, i+1] (so an anomaly's `pixel_x` indexes the pixel whose centre is at `pixel_x + 0.5`).
 * The WCS is FITS: 1-based, centres on integers, +Y up.
 */
export function pixelToSky(patch: Patch, x: number, y: number): { ra: number; dec: number } {
  const { wcs, height_px } = patch
  const dx = x + 0.5 - wcs.crpix1
  const dy = height_px - y + 0.5 - wcs.crpix2
  const xi = (wcs.cd1_1 * dx + wcs.cd1_2 * dy) * RAD // standard (tangent-plane) coordinates
  const eta = (wcs.cd2_1 * dx + wcs.cd2_2 * dy) * RAD
  const ra0 = wcs.crval1 * RAD
  const dec0 = wcs.crval2 * RAD
  const rho = Math.hypot(xi, eta)
  const c = Math.atan(rho)
  const dec = Math.asin(
    Math.cos(c) * Math.sin(dec0) + (rho === 0 ? 0 : (eta * Math.sin(c) * Math.cos(dec0)) / rho),
  )
  const ra =
    ra0 +
    Math.atan2(xi * Math.sin(c), rho * Math.cos(dec0) * Math.cos(c) - eta * Math.sin(dec0) * Math.sin(c))
  return { ra: (((ra / RAD) % 360) + 360) % 360, dec: dec / RAD }
}

/**
 * Sky -> image position: the inverse of `pixelToSky`, same continuous convention
 * (x right, y down, pixel i spans [i, i+1]). Returns null for points behind the tangent plane.
 */
export function skyToPixel(patch: Patch, ra: number, dec: number): { x: number; y: number } | null {
  const { wcs, height_px } = patch
  const a = ra * RAD
  const d = dec * RAD
  const ra0 = wcs.crval1 * RAD
  const dec0 = wcs.crval2 * RAD
  const cosc = Math.sin(dec0) * Math.sin(d) + Math.cos(dec0) * Math.cos(d) * Math.cos(a - ra0)
  if (cosc <= 0) return null
  const xi = ((Math.cos(d) * Math.sin(a - ra0)) / cosc) / RAD // standard coordinates, degrees
  const eta = ((Math.cos(dec0) * Math.sin(d) - Math.sin(dec0) * Math.cos(d) * Math.cos(a - ra0)) / cosc) / RAD
  const det = wcs.cd1_1 * wcs.cd2_2 - wcs.cd1_2 * wcs.cd2_1
  const dx = (wcs.cd2_2 * xi - wcs.cd1_2 * eta) / det // invert the CD matrix
  const dy = (-wcs.cd2_1 * xi + wcs.cd1_1 * eta) / det
  return { x: dx + wcs.crpix1 - 0.5, y: height_px - (dy + wcs.crpix2) + 0.5 }
}
