import type { GeoJSON, Position } from 'geojson'

/** A ring of [lat, lng] points, as Leaflet takes it. */
export type Ring = [number, number][]

/**
 * A rectangle around the world: the outer ring of the mask. Three world widths, so a region ring unwrapped past
 * ±180° (antimeridian) still lies inside it, and the world copies left and right are masked too.
 */
export const WORLD: Ring = [
  [-90, -540],
  [-90, 540],
  [90, 540],
  [90, -540],
]

/** Every ring (outer and holes) of every Polygon / MultiPolygon in the source, in GeoJSON [lng, lat]. */
function areaRings(source: GeoJSON | null): Position[][] {
  switch (source?.type) {
    case 'Polygon':
      return source.coordinates
    case 'MultiPolygon':
      return source.coordinates.flat()
    case 'Feature':
      return areaRings(source.geometry)
    case 'FeatureCollection':
      return source.features.flatMap(areaRings)
    default:
      return []
  }
}

/**
 * GeoJSON [lng, lat] -> [lat, lng]. Each step takes the short way round (|Δlng| <= 180°), so a ring across the
 * antimeridian stays in one piece.
 */
function toLatLng(ring: Position[]): Ring {
  let previous: number | undefined
  return ring.map(([lng = 0, lat = 0]) => {
    if (previous !== undefined) lng += Math.round((previous - lng) / 360) * 360
    previous = lng
    return [lat, lng]
  })
}

/**
 * GeoJSON region -> rings for one Leaflet polygon: the world first, then every region ring as a hole.
 * Region holes (lakes) stay in the list: with the even-odd fill they are masked again, and ring order does not matter.
 */
export function maskRings(source: GeoJSON): Ring[] {
  return [WORLD, ...areaRings(source).map(toLatLng)]
}
