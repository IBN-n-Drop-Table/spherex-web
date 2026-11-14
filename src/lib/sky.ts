// Infrared all-sky HiPS (AllWISE W1/W2/W4) hosted by NASA/IRSA. The CDS servers that Aladin
// resolves 'P/allWISE/color' to were unavailable (404 / timeout), so we point at the IRSA
// mirror directly. Needs network.
export const SKY_SURVEY = 'https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/RGB-W4-W2-W1'

// Visible-light all-sky (DSS2 colour, photographic plates), same IRSA mirror: the "what your eye
// sees" side of the visible / infrared comparison.
export const VISIBLE_SURVEY = 'https://irsa.ipac.caltech.edu/data/hips/CDS/DSS2/color'

/** Aladin's own panels, all off: our UI provides coordinates, zoom and layers. */
export const HIDDEN_UI = {
  showZoomControl: false,
  showLayersControl: false,
  showFullscreenControl: false,
  showProjectionControl: false,
  showSimbadPointerControl: false,
  showCooGridControl: false,
  showSettingsControl: false,
  showShareControl: false,
  showStatusBar: false,
  showFrame: false,
  showFov: false,
  showCooLocation: false,
  // NOT a panel: this switch decides whether Aladin DRAWS catalogs at all (our target markers).
  showCatalog: true,
  showReticle: false,
  backgroundColor: 'rgb(0, 0, 0)', // space-black when no tiles load (default grey looks broken)
  log: false, // default true: pings a CDS logger on startup (leaks the page URL) and throws offline
}
