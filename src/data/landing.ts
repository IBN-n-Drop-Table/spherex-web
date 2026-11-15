// Local copies for the landing page, so it works with the backend asleep or down.
// The story lines are the backend's own (GET /api/v1/targets, `story_es`); the spectrum is the
// real SPHEREx spectrum of Epsilon Indi B served by the backend (GET /api/v1/sky-patch).

export interface LandingObject {
  key: string
  name: string
  kind: string
  /** One line from the backend: how long ago the light left the object. */
  story: string
  ra: number
  dec: number
  image: string
}

export const LANDING_OBJECTS: LandingObject[] = [
  {
    "key": "BARNARDS_STAR",
    "name": "Barnard's Star",
    "kind": "Red dwarf, the fastest-moving star in our sky",
    "story": "The light you see left this star about 6 years ago.",
    "ra": 269.452075,
    "dec": 4.693391,
    "image": "/landing/barnard-1.png"
  },
  {
    "key": "EPSILON_INDI_B",
    "name": "Epsilon Indi B",
    "kind": "A pair of brown dwarfs orbiting a star",
    "story": "The light you see left these brown dwarfs about 12 years ago.",
    "ra": 331.076667,
    "dec": -56.7825,
    "image": "/landing/epsilon-1.png"
  },
  {
    "key": "WISE_0855",
    "name": "WISE 0855",
    "kind": "A cold, fast-moving brown dwarf",
    "story": "The light you see left this brown dwarf about 7 years ago.",
    "ra": 133.795129,
    "dec": -7.245147,
    "image": "/landing/wise0855.png"
  },
  {
    "key": "RW_AURIGAE",
    "name": "RW Aurigae",
    "kind": "A very young variable star",
    "story": "The light you see left here roughly 510 years ago (the distance to this young system is hard to measure precisely).",
    "ra": 76.956542,
    "dec": 30.401444,
    "image": "/landing/rw-aurigae.png"
  },
  {
    "key": "R_DRACONIS",
    "name": "R Draconis",
    "kind": "An old red giant that pulses",
    "story": "The light you see left this star roughly 2,600 years ago (pulsating giants like this one are hard to measure).",
    "ra": 248.165,
    "dec": 66.755,
    "image": "/landing/r-draconis.png"
  }
]

/** [wavelength in micron, brightness in MJy/sr] for each SPHEREx channel of Epsilon Indi B. */
export const EPSILON_INDI_SPECTRUM: [number, number][] = [[0.75, -0.01], [0.772, 0.0], [0.795, 0.03], [0.813, 0.05], [0.833, 0.11], [0.852, 0.21], [0.873, 0.33], [0.893, 0.46], [0.915, 0.68], [0.937, 0.81], [0.959, 1.19], [0.982, 1.4], [1.005, 1.77], [1.029, 2.33], [1.054, 2.63], [1.096, 2.69], [1.109, 2.41], [1.135, 1.92], [1.162, 2.11], [1.189, 2.35], [1.217, 3.55], [1.246, 4.45], [1.276, 6.41], [1.306, 5.78], [1.337, 1.98], [1.369, 0.95], [1.402, 0.81], [1.47, 2.04], [1.505, 3.5], [1.542, 4.96], [1.579, 5.69], [1.618, 5.51], [1.638, 3.86], [1.676, 4.77], [1.733, 3.5], [1.78, 2.38], [1.822, 1.74], [1.865, 1.54], [1.908, 2.08], [1.952, 1.47], [1.997, 2.64], [2.043, 3.78], [2.091, 4.48], [2.139, 4.28], [2.189, 4.03], [2.24, 2.77], [2.291, 2.18], [2.344, 1.8], [2.396, 1.92], [2.442, 2.08], [2.516, 1.32], [2.6, 1.33], [2.672, 1.72], [2.744, 1.18], [2.818, 1.43], [2.895, 2.02], [2.976, 2.36], [3.057, 2.73], [3.141, 1.8], [3.228, 1.51], [3.314, 1.61], [3.405, 1.56], [3.497, 2.03], [3.591, 3.23], [3.688, 3.44], [3.787, 6.76], [3.831, 7.03], [3.865, 7.44], [3.897, 8.47], [3.93, 6.88], [3.965, 8.53], [3.999, 9.05], [4.035, 8.55], [4.07, 8.95], [4.105, 6.93], [4.141, 8.67], [4.177, 7.8], [4.213, 6.09], [4.248, 6.05], [4.285, 5.42], [4.322, 5.27], [4.359, 4.9], [4.396, 4.42], [4.423, 3.84], [4.455, 3.29], [4.502, 2.67], [4.541, 2.64], [4.574, 2.56], [4.607, 2.57], [4.641, 2.93], [4.675, 3.48], [4.709, 3.52], [4.743, 3.23], [4.778, 2.57], [4.812, 2.67], [4.846, 2.63], [4.882, 3.05], [4.918, 2.63], [4.954, 3.14], [4.99, 3.52]]

/** The wavelengths the chemical filters look at, in micron (same as the viewer's chart). */
export const CHEMICAL_BANDS: { name: string; from: number; to: number }[] = [
  { name: 'H2O', from: 1.4, to: 1.9 },
  { name: 'H2O', from: 2.6, to: 2.8 },
  { name: 'CO2', from: 4.2, to: 4.4 },
  { name: 'CO', from: 4.6, to: 4.74 },
]

/** A real pre-written answer of the assistant (what it says when no AI provider is available). */
export const EXAMPLE_CHAT = {
  question: 'Why does this star move?',
  answer:
    "All stars move through the galaxy, but distant ones seem to stand still. Very nearby ones, like Barnard's Star or Epsilon Indi B, visibly change position in the sky within a few months: this is their 'proper motion'.",
}
