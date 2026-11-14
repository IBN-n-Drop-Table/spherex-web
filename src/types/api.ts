// contracts with backend
export interface TargetInfo {
  name: string
  ra_deg: number
  dec_deg: number
  fov_arcmin: number
  is_cached_golden_path: boolean
}

export interface Epoch {
  epoch_id: string                              // "2025_M0"
  date: string                                  // ISO 8601
  image_url: string
  chemical_filters: Record<string, string>     // { H2O: url, CO2: url }
}

export interface Anomaly {
  anomaly_id: string
  ra_deg: number
  dec_deg: number
  pixel_x: number
  pixel_y: number
  snr_confidence: number
  contamination_flags: string[]
  is_clean_detection: boolean
}

export interface DifferenceImaging {
  subtracted_image_url: string
  detected_anomalies: Anomaly[]
}

export interface SpectrumPoint {
  wavelength_um: number
  bandwidth_um: number
  flux_mjy_sr: number
  variance: number
  detector: number
}

export interface LightCurvePoint {
  epoch_id: string
  date: string                                  // "YYYY-MM-DD" (no time, unlike Epoch.date)
  flux_mjy_sr: number
  variance: number
}

export interface SkyPatchResponse {
  target_info: TargetInfo
  timelapse_epochs: Epoch[]
  difference_imaging: DifferenceImaging
  spectrum_102_bands: SpectrumPoint[]
  light_curve: LightCurvePoint[]
}

export interface SkyQuery {
  target?: string // e.g. "WISE_0855"
  ra?: number     // degrees
  dec?: number    // degrees
  fov?: number    // arcmin
}
