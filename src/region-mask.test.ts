import type { Polygon } from 'geojson'
import { map as leafletMap, SVG, type Map } from 'leaflet'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { regionMask, type RegionMask, type RegionMaskOptions } from './region-mask'

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

  describe('grid', () => {
    const add = async (options?: RegionMaskOptions) => {
      const mask = regionMask(square, options)
      const event = settled(mask)
      mask.addTo(map)
      await event
      const path = container.querySelector<SVGPathElement>('path.leaflet-region-mask')!
      const id = /^url\("?#([^")]+)"?\)$/.exec(path.style.fill)?.[1]
      return { pattern: id ? container.querySelector(`pattern#${id}`) : null, path }
    }

    it('default: the mask fill is a 24 px grid pattern in map units, ground + line classes', async () => {
      const { pattern } = await add()
      expect(pattern?.getAttribute('patternUnits')).toBe('userSpaceOnUse')
      expect([pattern?.getAttribute('width'), pattern?.getAttribute('height')]).toEqual(['24', '24'])
      expect(pattern?.querySelector('.leaflet-region-mask-ground')).not.toBeNull()
      expect(pattern?.querySelector('.leaflet-region-mask-grid')).not.toBeNull()
      expect(container.style.getPropertyValue('--region-mask-cell')).toBe('24px')
    })

    it('grid: 40 sets the cell size of the pattern and of the map background', async () => {
      const { pattern } = await add({ grid: 40 })
      expect([pattern?.getAttribute('width'), pattern?.getAttribute('height')]).toEqual(['40', '40'])
      expect(container.style.getPropertyValue('--region-mask-cell')).toBe('40px')
    })

    it('grid: false: plain ground, no pattern', async () => {
      const { pattern, path } = await add({ grid: false })
      expect(pattern).toBeNull()
      expect(path.style.fill).toBe('')
      expect(container.querySelector('pattern')).toBeNull()
      expect(container.classList.contains('leaflet-region-mask-plain')).toBe(true)
    })

    it('two masks on two maps get different pattern ids', async () => {
      const other = document.createElement('div')
      document.body.append(other)
      const otherMap = leafletMap(other).setView([0, 0], 2)
      const mask = regionMask(square)
      const event = settled(mask)
      mask.addTo(otherMap)
      await event
      const { pattern } = await add()
      expect(other.querySelector('pattern')?.id).not.toBe(pattern?.id)
      otherMap.remove()
      other.remove()
    })
  })

  it('padding: the SVG renderer covers that many map sizes around the view (default 1)', async () => {
    const paddings = async (options?: RegionMaskOptions) => {
      const mask = regionMask(square, options)
      const event = settled(mask)
      mask.addTo(map)
      await event
      const found: unknown[] = []
      map.eachLayer((layer) => {
        if (layer instanceof SVG) found.push(layer.options.padding)
      })
      mask.remove()
      return found
    }
    expect(await paddings()).toEqual([1])
    expect(await paddings({ padding: 0.5 })).toEqual([0.5])
  })

  describe('remove() restores the map', () => {
    const traces = () => ({
      classes: [...container.classList].filter((c) => c.startsWith('leaflet-region-mask')),
      svg: container.querySelectorAll('svg').length,
      style: container.getAttribute('style'),
    })

    it('after ready: no mask, renderer, defs, classes or styles left', async () => {
      const before = traces()
      const mask = regionMask(square)
      const event = settled(mask)
      mask.addTo(map)
      await event
      mask.remove()
      expect(traces()).toEqual(before)
      expect(map.hasLayer(mask)).toBe(false)
    })

    it('while loading: aborts the fetch, fires nothing, draws nothing', async () => {
      let signal: AbortSignal | undefined
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, init: RequestInit) => {
          signal = init.signal ?? undefined
          return new Response(JSON.stringify(square))
        }),
      )
      const before = traces()
      const mask = regionMask('/region.geojson')
      const fired: string[] = []
      mask.on('ready error', (e) => fired.push(e.type))
      mask.addTo(map)
      mask.remove()
      await new Promise((done) => setTimeout(done, 20))
      expect(signal?.aborted).toBe(true)
      expect(fired).toEqual([])
      expect(traces()).toEqual(before)
    })

    it('can be added again after remove()', async () => {
      const mask = regionMask(square)
      mask.addTo(map).remove()
      const event = settled(mask)
      mask.addTo(map)
      expect(await event).toBe('ready')
      expect(container.querySelectorAll('path.leaflet-region-mask')).toHaveLength(1)
    })
  })
})
