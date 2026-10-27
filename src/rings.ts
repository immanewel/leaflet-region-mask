import type { GeoJSON, Position } from 'geojson'

/** A ring of [lat, lng] points, as Leaflet takes it. */
export type Ring = [number, number][]

/** A rectangle around the world: the outer ring of the mask. */
export const WORLD: Ring = [
  [-90, -180],
  [-90, 180],
  [90, 180],
  [90, -180],
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

const toLatLng = (ring: Position[]): Ring => ring.map(([lng, lat]) => [lat as number, lng as number])

/**
 * GeoJSON region -> rings for one Leaflet polygon: the world first, then every region ring as a hole.
 * Region holes (lakes) stay in the list: with the even-odd fill they are masked again, and ring order does not matter.
 */
export function maskRings(source: GeoJSON): Ring[] {
  return [WORLD, ...areaRings(source).map(toLatLng)]
}
