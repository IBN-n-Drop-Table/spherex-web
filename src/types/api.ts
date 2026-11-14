// Contract with spherex-api (branch feat/offline-first-live-jobs). Source of truth:
// spherex-api/app/schemas/sky_patch.py, jobs.py, and docs/contract-example.json.

export interface TargetInfo {
  name: string
  ra_deg: number // CATALOGUE position; for fast movers it differs from patch.wcs.crval
  dec_deg: number
  fov_arcmin: number
  is_cached_golden_path: boolean
}

/** FITS WCS of every image in the response: 1-based pixels, +Y up, North up, East left. */
export interface PatchWCS {
  ctype1: string // "RA---TAN"
  ctype2: string // "DEC--TAN"
  crval1: number // patch centre (the target at epoch 1)
  crval2: number
  crpix1: number
  crpix2: number
  cd1_1: number // deg/px, negative
  cd1_2: number
  cd2_1: number
  cd2_2: number // deg/px, positive
}

/** Geometry shared by every image in the response (timelapse, filters, difference). */
export interface Patch {
  width_px: number
  height_px: number
  wcs: PatchWCS
}

export type ImageFormat = 'png' | 'fits'

export interface Epoch {
  epoch_id: string // "2025_M0"
  date: string // ISO 8601
  image_format: ImageFormat
  image_url: string
  // H2O, CO2, CO. A molecule is OMITTED when no exposure of that visit covers its window,
  // so the keys can differ from one epoch to the next.
  chemical_filters: Record<string, string>
  n_exposures?: number | null
}

export interface SpectrumPoint {
  wavelength_um: number
  bandwidth_um: number
  flux_mjy_sr: number
  variance: number
  detector: number
  quality?: 'good' | 'low' | null // `low`: measured off-core because the core saturates
}

export interface Anomaly {
  anomaly_id: string // NOT stable between pipeline runs
  ra_deg: number
  dec_deg: number
  pixel_x: number // 0-based PNG column, origin top-left
  pixel_y: number // 0-based PNG row, origin top-left
  snr_confidence: number
  contamination_flags: string[]
  is_clean_detection: boolean
  kind?: 'appeared' | 'disappeared' | null // brighter in epoch_a (later) / epoch_b (earlier)
  spectrum_epoch_id: string
  spectrum_102_bands: SpectrumPoint[]
}

export interface DifferenceImaging {
  epoch_a: string // subtracted = epoch_a - epoch_b
  epoch_b: string
  image_format: ImageFormat
  subtracted_image_url: string
  detected_anomalies: Anomaly[]
  detection_label?: string | null // "Detección Asistida por Software (BETA)"
  detection_notice?: string | null // "...requiere verificación humana"
}

export interface LightCurvePoint {
  epoch_id: string
  date: string // "YYYY-MM-DD" (no time, unlike Epoch.date)
  flux_mjy_sr: number | null // null = no valid photometry (see `note`), never a fake 0
  variance: number | null
  note?: string | null
}

export interface SkyPatchResponse {
  target_info: TargetInfo
  patch: Patch
  timelapse_epochs: Epoch[]
  difference_imaging: DifferenceImaging
  spectrum_102_bands: SpectrumPoint[] // may be empty (saturated stars)
  light_curve: LightCurvePoint[]
  spectrum_epoch_id?: string | null
  saturated?: boolean | null
  spectrum_message?: string | null
  band?: string | null
  fallback: boolean // IRSA failed: this is cached data for ANOTHER position
  fallback_message?: string | null
}

export interface SkyQuery {
  ra?: number // degrees
  dec?: number // degrees
  fov?: number // arcmin, 1-30 (live jobs are capped at 15)
}

// ---- Jobs: POST /api/v1/jobs, GET /api/v1/jobs/{id} ----

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface JobResponse {
  job_id: string
  kind: 'sky_patch' | 'spectrum'
  status: JobStatus
  result?: SkyPatchResponse | null // set when completed (sky_patch jobs)
  error?: string | null // set when failed
  created_at: string
  updated_at: string
  stage?: string | null // queued | query | download | stack | render | done | failed
  progress?: number | null // 0..1
  message?: string | null // human-readable, in Spanish
  eta_s?: number | null
  retry_after_ms?: number | null // suggested polling interval
}
