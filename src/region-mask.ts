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

/** A Leaflet layer that masks the world outside a GeoJSON region. Events: `ready`, `error`. */
export class RegionMask extends Layer {
  declare options: RegionMaskOptions & typeof DEFAULTS
  private readonly source: GeoJSON
  private path?: Polygon

  constructor(source: GeoJSON, options: RegionMaskOptions = {}) {
    super()
    this.source = source
    this.options = { ...DEFAULTS, ...options }
  }

  onAdd(map: Map): this {
    Promise.resolve(this.source).then((data) => {
      this.path = polygon(maskRings(data), {
        interactive: false,
        className: this.options.className,
        renderer: svg(),
      }).addTo(map)
      this.fire('ready')
    })
    return this
  }

  onRemove(): this {
    this.path?.remove()
    return this
  }
}

/** Creates a {@link RegionMask}. */
export const regionMask = (source: GeoJSON, options?: RegionMaskOptions) => new RegionMask(source, options)
