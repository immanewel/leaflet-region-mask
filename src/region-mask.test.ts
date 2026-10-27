import type { Polygon } from 'geojson'
import { map as leafletMap, type Map } from 'leaflet'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  vi.unstubAllGlobals()
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

  it('URL source: fetches the GeoJSON and fires ready', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(square)))
    vi.stubGlobal('fetch', fetch)
    const mask = regionMask('/region.geojson')
    const event = settled(mask)
    mask.addTo(map)
    expect(await event).toBe('ready')
    expect(fetch).toHaveBeenCalledWith('/region.geojson', expect.anything())
    expect(container.querySelectorAll('path.leaflet-region-mask')).toHaveLength(1)
  })

  for (const [name, respond] of [
    ['HTTP 404', async () => new Response('', { status: 404 })],
    ['network error', async () => Promise.reject(new TypeError('Failed to fetch'))],
  ] as const) {
    it(`URL source, ${name}: fires error with the cause, draws no mask`, async () => {
      vi.stubGlobal('fetch', vi.fn(respond))
      const mask = regionMask('/region.geojson')
      const error = new Promise<unknown>((done) =>
        mask.once('error', (e) => done((e as unknown as { error: unknown }).error)),
      )
      mask.addTo(map)
      expect(await error).toBeInstanceOf(Error)
      expect(container.querySelectorAll('path.leaflet-region-mask')).toHaveLength(0)
    })
  }

  describe('tiles hidden until ready (loading class on the map container)', () => {
    const loading = () => container.classList.contains('leaflet-region-mask-loading')

    it('set while the region loads, cleared on ready', async () => {
      const mask = regionMask(square)
      const event = settled(mask)
      mask.addTo(map)
      expect(loading()).toBe(true)
      await event
      expect(loading()).toBe(false)
    })

    it('cleared on error too: the tiles show without a mask', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('', { status: 500 })),
      )
      const mask = regionMask('/region.geojson')
      const event = settled(mask)
      mask.addTo(map)
      expect(loading()).toBe(true)
      expect(await event).toBe('error')
      expect(loading()).toBe(false)
    })

    it('never set with hideTilesUntilReady: false', async () => {
      const mask = regionMask(square, { hideTilesUntilReady: false })
      const event = settled(mask)
      mask.addTo(map)
      expect(loading()).toBe(false)
      await event
    })
  })
})
