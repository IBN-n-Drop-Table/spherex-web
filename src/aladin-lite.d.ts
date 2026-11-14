// Minimal typings for the parts of Aladin Lite v3 we use (the package ships none).
declare module 'aladin-lite' {
  export interface AladinOptions {
    target?: string
    fov?: number // degrees (width)
    survey?: string // HiPS id or URL
    projection?: string
    [option: string]: unknown
  }

  export interface GraphicOverlay {
    add(shape: unknown): void
    removeAll(): void
  }

  /** A table of sources drawn on the sky (here: the five challenge targets). */
  export interface Catalog {
    addSources(sources: unknown[]): void
  }

  export interface AladinInstance {
    getRaDec(): [number, number] // ICRS degrees, RA in [0, 360)
    getFov(): [number, number] // [width, height] in degrees
    getSize(): [number, number] // [width, height] in CSS pixels
    gotoRaDec(ra: number, dec: number): void
    setFoV(fovDeg: number): void
    /** Screen pixel -> sky. May throw / return NaN outside the projection (e.g. beyond the AIT ellipse). */
    pix2world(x: number, y: number, frame?: string): [number, number]
    /** Sky -> screen pixel. May be undefined when the point is not visible in this projection. */
    world2pix(ra: number, dec: number, frame?: string): [number, number] | undefined
    addOverlay(overlay: GraphicOverlay): void
    addCatalog(catalog: Catalog): void
    // NOTE: Aladin keeps ONE callback per event name; a second `on` replaces the first.
    on(event: 'positionChanged' | 'zoomChanged', callback: (arg?: unknown) => void): void
  }

  const A: {
    init: Promise<void> // resolves when the WASM core is ready
    aladin(element: HTMLElement, options?: AladinOptions): AladinInstance
    graphicOverlay(options?: { name?: string; color?: string; lineWidth?: number }): GraphicOverlay
    catalog(options?: { [option: string]: unknown }): Catalog
    /** A source at (ra, dec) carrying `data` (e.g. { name }), which labels can display. */
    source(ra: number, dec: number, data?: Record<string, unknown>, options?: Record<string, unknown>): unknown
    polygon(vertices: [number, number][], options?: { color?: string; lineWidth?: number }): unknown
  }
  export default A
}
