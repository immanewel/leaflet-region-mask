# PRD: leaflet-region-mask

## Problem

A map app often covers one region only (a country, a district, a site). Leaflet shows the whole world, so users see
tiles that do not matter and lose focus. Existing options cut each tile on a canvas (`leaflet-boundary-canvas`) or
fill the outside with one flat colour (`leaflet.mask`). Canvas cutting is heavy and needs a large boundary file.
Flat fills do not follow light and dark themes, and world tiles flash before the outline loads.

## Solution

A small Leaflet plugin. It draws one polygon: a rectangle around the world with the region as a hole. The outside
gets an opaque ground with a grid (SVG pattern in map units, so it moves with the map). Colours come from CSS
variables, so themes work with no code. Tiles stay hidden until the mask is in place (no flash).

Origin: the mainland mask of Mmuya House Rent (`src/components/houses/tz-leaflet.ts`, `src/lib/houses/map-picker.ts`).

## User stories

1. As a map developer, I add `L.regionMask(geojson).addTo(map)`, so only my region shows map detail.
2. As a map developer, I pass a URL instead of GeoJSON, so the outline loads lazily.
3. As a map developer, I pass any Polygon, MultiPolygon, Feature or FeatureCollection, so islands and holes (lakes) work.
4. As a map developer, I set the grid size, or turn the grid off, so the outside fits my design.
5. As a map developer, I style ground, grid and edge with CSS variables, so light and dark themes work.
6. As a map user, I never see world tiles flash before the mask loads.
7. As a map user, if the outline fails to load, I still get a working map with all tiles.
8. As a map user, panning and zooming out never shows tiles past the mask edge.
9. As a developer, I remove the mask (`remove()`), and the map and tiles return to normal.
10. As a developer, I get TypeScript types and an ESM build with Leaflet as the only peer dependency.
11. As a user with low vision, the region edge has at least 3:1 contrast against both sides with the default colours.

## API (v1)

```ts
L.regionMask(source: GeoJSON | string, {
  grid?: number | false      // cell size in px, default 24
  padding?: number           // SVG renderer padding, default 1 (one map size)
  hideTilesUntilReady?: boolean // default true
  className?: string         // default 'leaflet-region-mask'
}): RegionMask               // extends L.Layer; events: 'ready', 'error'
```

CSS variables: `--region-mask-ground`, `--region-mask-grid`, `--region-mask-edge`, `--region-mask-edge-width`.

## Implementation decisions

- Pure module `rings.ts`: GeoJSON → mask rings (world ring + region holes, ring orientation, antimeridian safe). Unit tested.
- Leaflet layer `region-mask.ts`: SVG renderer with padding, `<pattern>` defs, ready class on the map container.
- Size goal: < 3 KB min+gzip. No runtime dependencies.
- Build: tsup (ESM + CJS + d.ts). Tests: Vitest (+ jsdom) for pure code; Playwright pixel test on the demo page.
- Demo: `demo/index.html` with a Tanzania mainland outline, light/dark toggle.
- License: MIT (file now; repo stays private until the owner decides to publish).

## Out of scope (v1)

Canvas renderer, raster masks, vector tiles, multiple masks per map, publishing to npm (owner does it).
