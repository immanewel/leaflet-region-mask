import type { Polygon } from 'geojson'
import { describe, expect, it } from 'vitest'
import { maskRings, WORLD, type Ring } from './rings'

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

describe('maskRings', () => {
  it('Polygon: world ring first, then the region as a hole in [lat, lng]', () => {
    expect(maskRings(square)).toEqual([
      WORLD,
      [
        [-10, 30],
        [-10, 40],
        [0, 40],
        [0, 30],
        [-10, 30],
      ],
    ])
  })

  it('Polygon with a hole (lake): the hole ring is kept, so even-odd fill masks the lake', () => {
    const lake = [
      [34, -6],
      [35, -6],
      [35, -5],
      [34, -6],
    ]
    const rings = maskRings({ ...square, coordinates: [square.coordinates[0]!, lake] })
    expect(rings).toHaveLength(3)
    expect(rings[2]).toEqual(lake.map(([lng, lat]) => [lat, lng]))
  })

  it('MultiPolygon: every polygon (island) is a hole', () => {
    const island = square.coordinates[0]!.map(([lng, lat]) => [lng! + 20, lat!])
    const rings = maskRings({ type: 'MultiPolygon', coordinates: [square.coordinates, [island]] })
    expect(rings).toHaveLength(3)
    expect(rings[2]![0]).toEqual([-10, 50])
  })

  it('Feature and FeatureCollection: area geometries are holes; null, point and line geometries are skipped', () => {
    const feature = { type: 'Feature', properties: null, geometry: square } as const
    expect(maskRings(feature)).toEqual(maskRings(square))
    const rings = maskRings({
      type: 'FeatureCollection',
      features: [
        feature,
        { type: 'Feature', properties: null, geometry: null as never },
        { type: 'Feature', properties: null, geometry: { type: 'Point', coordinates: [0, 0] } },
        { type: 'Feature', properties: null, geometry: { type: 'MultiPolygon', coordinates: [square.coordinates] } },
      ],
    })
    expect(rings).toEqual([WORLD, square.coordinates[0]!.map(([lng, lat]) => [lat, lng]), rings[1]])
  })

  it('a source with no area: only the world ring (all masked)', () => {
    expect(
      maskRings({
        type: 'LineString',
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      }),
    ).toEqual([WORLD])
  })

  it('antimeridian: a ring across 180° stays continuous (no step over 180°) and inside the world ring', () => {
    const fiji: Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [179, -17],
          [-179, -17],
          [-179, -16],
          [179, -16],
          [179, -17],
        ],
      ],
    }
    const [world, ring] = maskRings(fiji) as [Ring, Ring]
    expect(ring.map(([, lng]) => lng)).toEqual([179, 181, 181, 179, 179])
    const lngs = world.map(([, lng]) => lng)
    expect(ring.every(([, lng]) => lng > Math.min(...lngs) && lng < Math.max(...lngs))).toBe(true)
  })
})
