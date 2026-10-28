# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-28

First public release.

### Added

- `regionMask(source, options)` and `RegionMask`: one SVG polygon, a rectangle around the world with the region
  rings as holes (even-odd fill), on its own padded SVG renderer.
- Source: GeoJSON object or URL; Polygon, MultiPolygon, Feature or FeatureCollection. Islands show the map, holes
  (lakes) are masked again, rings across the antimeridian stay in one piece.
- Opaque ground with a grid: SVG `<pattern>` in map units (`grid` option, `false` for a plain ground), and the same
  look on the map container before the mask loads.
- No flash of world tiles: the tile pane is hidden until the mask is in place (`hideTilesUntilReady`).
- `ready` and `error` events; on a load error the tiles show and no mask is drawn.
- CSS variables `--region-mask-ground`, `--region-mask-grid`, `--region-mask-edge`, `--region-mask-edge-width`, with
  `light-dark()` defaults; default edge at least 3:1 contrast against ground and OpenStreetMap land.
- `maskRings` helper export, ESM + CJS builds with types, `leaflet-region-mask/region-mask.css`.

[0.1.0]: https://github.com/immanewel/leaflet-region-mask/releases/tag/v0.1.0
