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

/** Difference between two CONSECUTIVE visits (later - earlier). Image and metadata only: the anomaly detector does not run on pairs. */
export interface PairwiseDifference {
  kind: 'consecutive'
  epoch_a: string // later visit: subtracted = epoch_a - epoch_b
  epoch_b: string // earlier visit
  image_format: ImageFormat
  subtracted_image_url: string
  delta_t_days: number
  detectors_used: number[]
  expected_shift_arcsec?: number | null // catalogue proper motion x delta_t
  weak_signal: boolean // expected shift below one SPHEREx pixel (6.15"): any dipole will be faint
}

export interface DifferenceImaging {
  epoch_a: string // subtracted = epoch_a - epoch_b
  epoch_b: string
  image_format: ImageFormat
  subtracted_image_url: string // first vs last visit: the anomaly detector runs on this one
  detected_anomalies: Anomaly[]
  detection_label?: string | null // "Detección Asistida por Software (BETA)"
  detection_notice?: string | null // "...requiere verificación humana"
  kind?: 'first_vs_last'
  delta_t_days?: number | null
  detectors_used?: number[] | null
  expected_shift_arcsec?: number | null
  weak_signal?: boolean | null
  pairwise?: PairwiseDifference[] // consecutive-visit differences; empty with fewer than 3 visits
}

export interface LightCurvePoint {
  epoch_id: string
  date: string // "YYYY-MM-DD" (no time, unlike Epoch.date)
  flux_mjy_sr: number | null // null = no valid photometry (see `note`), never a fake 0
  variance: number | null
  note?: string | null
}

/** GET /api/v1/targets: one of the challenge objects, with its distance (from the parallax). */
export interface TargetSummary {
  key: string // e.g. BARNARDS_STAR
  name: string
  ra_deg: number
  dec_deg: number
  fov_arcmin: number
  is_cached_golden_path: boolean
  n_epochs: number
  distance_ly?: number | null
  distance_source?: string | null // the parallax citation (Gaia DR3 with source_id, or Kirkpatrick et al. 2021)
  light_left_years_ago?: number | null // rounded (2 significant figures when the distance is uncertain)
  distance_uncertain?: boolean | null // say "roughly"
}

export type ChatTone = 'easy' | 'technical'
export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}
/** POST /api/v1/chat */
export interface ChatRequest {
  message: string // 1-500 characters
  tone: ChatTone
  context?: Record<string, unknown> // <= 4 KB; the server reads science_note / quality / saturated / weak_signal at any depth
  history?: ChatTurn[] // the server keeps the last 6 turns
}
export interface ChatResponse {
  answer: string
  provider: 'groq' | 'deepseek' | 'canned'
  cached: boolean
  fallback: boolean // true: a pre-written answer, not an AI one
  disclaimer: string
  cautions: string[] // always shown with the answer
}
export interface ChatSuggestions {
  target: string | null
  suggestions: string[]
}

/** "Find what moves": one round = two visits of the same patch to flicker between. */
export interface GameRound {
  round_id: string
  target_id: string
  target_name: string
  kind: 'first_vs_last' | 'consecutive'
  epoch_a: string // the later visit
  epoch_b: string // the earlier visit
  date_a: string
  date_b: string
  image_a_url: string
  image_b_url: string
  hint_image_url: string | null // only in weak-signal rounds: the difference image
  image_size: { width: number; height: number }
  weak_signal: boolean // the expected motion is under one SPHEREx pixel
  difficulty: 'easy' | 'medium' | 'hard'
  delta_t_days: number
  expected_shift_arcsec: number
}
export interface GameSession {
  session_id: string
  expires_at: string
  rounds: GameRound[]
  scoring: string
}
export interface GamePoint {
  x: number
  y: number
}
export interface GuessResult {
  hit: boolean
  distance_px: number
  score: number // 0-1000, computed by the server
  answer: GamePoint
  answer_path: GamePoint[] // the object's position in the earlier visit, then in the later one
  hit_radius_px: number
  explanation_es: string
}
export interface FinishResult {
  session_id: string
  nickname: string
  score: number
  hits: number
  rounds_played: number
  rounds_total: number
  stored_in: string
}
export interface LeaderboardEntry {
  nickname: string
  score: number
  hits: number
  rounds_played: number
  rounds_total: number
  created_at: string
}
export interface Leaderboard {
  entries: LeaderboardEntry[]
  backend: 'memory' | 'supabase'
}

/** Why cached data was served instead of a live answer. */
export type FallbackReason = 'irsa_unavailable' | 'live_processing_unavailable' | 'unknown'
/** Response-level data quality (not the per-channel `SpectrumPoint.quality`). */
export type ResponseQuality = 'unvalidated' | 'low'

/** One citation: the data a response comes from (same as GET /credits). */
export interface DataCredit {
  id: string
  source: string
  dataset: string
  used_for: string
  citation?: string | null
  doi?: string | null
  url: string
  access?: string | null
}

/** GET /api/v1/credits */
export interface CreditsResponse {
  data_credits: DataCredit[]
  acknowledgement: string // the SPHEREx acknowledgement text requested by IRSA
  acknowledgement_source: string
  software: string[]
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
  fallback_reason?: FallbackReason | null
  science_note?: string | null // what can and cannot be claimed from this object's data
  quality?: ResponseQuality | null
  data_credits?: DataCredit[] | null
}

/** GET /api/v1/spectrum: a target's, an anomaly's, or any position's spectrum. */
export interface SpectrumResponse {
  source: 'target' | 'anomaly'
  target_name: string | null // "RA 133.7275 Dec -7.2480" for a live position
  anomaly_id?: string | null
  ra_deg: number // where the spectrum was measured
  dec_deg: number
  epoch_id: string
  is_cached_golden_path: boolean // false: computed live from IRSA
  spectrum_102_bands: SpectrumPoint[] // live positions give ~1 channel per detector
  saturated?: boolean | null
  spectrum_message?: string | null
  fallback: boolean // IRSA failed: this is the cached TARGET spectrum, not the clicked point's
  fallback_message?: string | null
  fallback_reason?: FallbackReason | null
  science_note?: string | null // what can and cannot be claimed from this object's data
  quality?: ResponseQuality | null
  data_credits?: DataCredit[] | null
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
  result?: SkyPatchResponse | SpectrumResponse | null // set when completed (by `kind`)
  error?: string | null // set when failed
  created_at: string
  updated_at: string
  stage?: string | null // queued | query | download | stack | render | done | failed
  progress?: number | null // 0..1
  message?: string | null // human-readable, in Spanish
  eta_s?: number | null
  retry_after_ms?: number | null // suggested polling interval
}

// ---- Citizen reports: GET/POST /api/v1/reports, POST /api/v1/reports/{id}/verify ----

export type Classification =
  | 'asteroid'
  | 'brown_dwarf'
  | 'high_proper_motion_star'
  | 'variable_star'
  | 'transient_anomaly'
  | 'other'

/** Body of POST /reports. The backend rejects unknown fields, so send only these. */
export interface CitizenReportCreate {
  discoverer: string // 1-50 chars
  notes?: string // up to 1000 chars
  ra_deg: number
  dec_deg: number
  target_name?: string
  pixel_x?: number // must come together with pixel_y
  pixel_y?: number
  classification: Classification
  anomaly_id?: string
  snapshot_url?: string
}

export interface CitizenReport extends Omit<CitizenReportCreate, 'notes' | 'target_name' | 'pixel_x' | 'pixel_y' | 'anomaly_id' | 'snapshot_url'> {
  id: string
  created_at: string
  verifications_count: number // includes the discoverer's own report
  notes?: string | null
  target_name?: string | null
  pixel_x?: number | null
  pixel_y?: number | null
  anomaly_id?: string | null
  snapshot_url?: string | null
}
