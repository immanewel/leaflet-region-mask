import type { GeoJSON } from 'geojson'
import { DomUtil, Layer, polygon, svg, type LayerOptions, type Map, type Polygon, type SVG } from 'leaflet'
import { maskRings } from './rings'

export interface RegionMaskOptions extends LayerOptions {
  /** Hide the tile pane until the mask is in place (or the region fails to load). Default `true`. */
  hideTilesUntilReady?: boolean
  /** CSS class of the mask path, and prefix of the other classes. Default `leaflet-region-mask`. */
  className?: string
}

const DEFAULTS = {
  hideTilesUntilReady: true,
  className: 'leaflet-region-mask',
}

/** The source as GeoJSON: fetched when it is a URL. Rejects on a network error or an HTTP error status. */
async function load(source: GeoJSON | string, signal: AbortSignal): Promise<GeoJSON> {
  if (typeof source !== 'string') return source
  const response = await fetch(source, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${source}`)
  return response.json()
}

/** A Leaflet layer that masks the world outside a GeoJSON region. Events: `ready`, `error`. */
export class RegionMask extends Layer {
  declare options: RegionMaskOptions & typeof DEFAULTS
  private readonly source: GeoJSON | string
  private abort?: AbortController
  private renderer?: SVG
  private path?: Polygon

  constructor(source: GeoJSON | string, options: RegionMaskOptions = {}) {
    super()
    this.source = source
    this.options = { ...DEFAULTS, ...options }
  }

  private get loadingClass() {
    return `${this.options.className}-loading`
  }

  onAdd(map: Map): this {
    const container = map.getContainer()
    if (this.options.hideTilesUntilReady) DomUtil.addClass(container, this.loadingClass)
    const abort = (this.abort = new AbortController())
    load(this.source, abort.signal)
      .then((data) => {
        if (abort.signal.aborted) return
        this.draw(map, data)
        this.settle(container, 'ready')
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted) this.settle(container, 'error', { error })
      })
    return this
  }

  onRemove(map: Map): this {
    this.abort?.abort()
    this.path?.remove()
    if (this.renderer) map.removeLayer(this.renderer)
    this.path = this.renderer = undefined
    DomUtil.removeClass(map.getContainer(), this.loadingClass)
    return this
  }

  /** Loading is over: the tiles show, listeners learn the outcome. */
  private settle(container: HTMLElement, type: 'ready' | 'error', data?: { error: unknown }) {
    DomUtil.removeClass(container, this.loadingClass)
    this.fire(type, data)
  }

  private draw(map: Map, data: GeoJSON) {
    this.renderer = svg()
    this.path = polygon(maskRings(data), {
      interactive: false,
      className: this.options.className,
      renderer: this.renderer,
    }).addTo(map)
  }
}

/** Creates a {@link RegionMask}. */
export const regionMask = (source: GeoJSON | string, options?: RegionMaskOptions) => new RegionMask(source, options)
