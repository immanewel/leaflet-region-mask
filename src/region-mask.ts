import type { GeoJSON } from 'geojson'
import { Layer, polygon, stamp, svg, type LayerOptions, type Map, type Polygon, type SVG } from 'leaflet'
import { addGridPattern } from './grid-pattern'
import { maskRings } from './rings'

export interface RegionMaskOptions extends LayerOptions {
  /** Grid cell size in CSS px, or `false` for a plain ground. Default `24`. */
  grid?: number | false
  /** SVG renderer padding, in map sizes around the view: a pan or zoom-out never runs past the mask. Default `1`. */
  padding?: number
  /** Hide the tile pane until the mask is in place (or the region fails to load). Default `true`. */
  hideTilesUntilReady?: boolean
  /** CSS class of the mask path, and prefix of the other classes. Default `leaflet-region-mask`. */
  className?: string
}

const DEFAULTS = {
  grid: 24 as number | false,
  padding: 1,
  hideTilesUntilReady: true,
  className: 'leaflet-region-mask',
}

/** Inline custom property on the map container: the grid cell of its background (region-mask.css). */
const CELL = '--region-mask-cell'

/** The source as GeoJSON: fetched when it is a URL. Rejects on a network error or an HTTP error status. */
async function load(source: GeoJSON | string, signal: AbortSignal): Promise<GeoJSON> {
  if (typeof source !== 'string') return source
  const response = await fetch(source, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${source}`)
  return response.json()
}

/**
 * A Leaflet layer that masks the world outside a GeoJSON region: one SVG path, the world with the region as a hole,
 * filled with an opaque ground and grid. Events: `ready` (mask in place), `error` (region failed to load; no mask).
 */
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

  /** Class on the map container while the region loads: the tiles are hidden (region-mask.css). */
  private get loadingClass() {
    return this.options.hideTilesUntilReady ? [`${this.options.className}-loading`] : []
  }

  /** Classes on the map container while the layer is on the map: ground + grid background, or plain ground. */
  private get mapClasses() {
    const { className, grid } = this.options
    return grid ? [`${className}-map`] : [`${className}-map`, `${className}-plain`]
  }

  onAdd(map: Map): this {
    const container = map.getContainer()
    container.classList.add(...this.mapClasses, ...this.loadingClass)
    if (this.options.grid) container.style.setProperty(CELL, `${this.options.grid}px`)
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
    const container = map.getContainer()
    container.classList.remove(...this.mapClasses, ...this.loadingClass)
    container.style.removeProperty(CELL)
    return this
  }

  /** Loading is over: the tiles show, listeners learn the outcome. */
  private settle(container: HTMLElement, type: 'ready' | 'error', data?: { error: unknown }) {
    container.classList.remove(...this.loadingClass)
    this.fire(type, data)
  }

  private draw(map: Map, data: GeoJSON) {
    const { className, grid, padding } = this.options
    this.renderer = svg({ padding })
    this.path = polygon(maskRings(data), { interactive: false, className, renderer: this.renderer }).addTo(map)
    const element = this.path.getElement() as SVGPathElement
    const root = element.ownerSVGElement
    if (grid && root) {
      const id = `${className}-${stamp(this)}`
      addGridPattern(root, id, grid, className)
      element.style.fill = `url(#${id})`
    }
  }
}

/** Creates a {@link RegionMask}. */
export const regionMask = (source: GeoJSON | string, options?: RegionMaskOptions) => new RegionMask(source, options)
