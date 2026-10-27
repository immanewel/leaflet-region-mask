import type { GeoJSON } from 'geojson'
import { Layer, polygon, svg, type LayerOptions, type Map, type Polygon } from 'leaflet'
import { maskRings } from './rings'

export interface RegionMaskOptions extends LayerOptions {
  /** CSS class of the mask path, and prefix of the other classes. Default `leaflet-region-mask`. */
  className?: string
}

const DEFAULTS: Required<Pick<RegionMaskOptions, 'className'>> = {
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
  private path?: Polygon

  constructor(source: GeoJSON | string, options: RegionMaskOptions = {}) {
    super()
    this.source = source
    this.options = { ...DEFAULTS, ...options }
  }

  onAdd(map: Map): this {
    const abort = new AbortController()
    load(this.source, abort.signal).then(
      (data) => {
        this.path = polygon(maskRings(data), {
          interactive: false,
          className: this.options.className,
          renderer: svg(),
        }).addTo(map)
        this.fire('ready')
      },
      (error: unknown) => this.fire('error', { error }),
    )
    return this
  }

  onRemove(): this {
    this.path?.remove()
    return this
  }
}

/** Creates a {@link RegionMask}. */
export const regionMask = (source: GeoJSON | string, options?: RegionMaskOptions) => new RegionMask(source, options)
