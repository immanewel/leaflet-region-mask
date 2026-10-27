import type { Polygon } from 'geojson'
import { map as leafletMap, type Map } from 'leaflet'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { regionMask, type RegionMask } from './region-mask'

const square: Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [30, -10],
      [40, -10],
      [40, 0],
      [30, 0],
      [30, -10],
    ],
  ],
}

let map: Map
let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  map = leafletMap(container).setView([-5, 35], 5)
})

afterEach(() => {
  map.remove()
  container.remove()
})

/** Resolves on the layer's next `ready` or `error` event, with its name. */
const settled = (mask: RegionMask) => new Promise<string>((done) => mask.once('ready error', (e) => done(e.type)))

describe('RegionMask', () => {
  it('GeoJSON source: draws one mask path with the class and fires ready', async () => {
    const mask = regionMask(square)
    const event = settled(mask)
    mask.addTo(map)
    expect(await event).toBe('ready')
    expect(container.querySelectorAll('svg path.leaflet-region-mask')).toHaveLength(1)
  })
})
