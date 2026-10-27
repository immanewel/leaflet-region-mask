// Leaflet checks SVG support with `createSVGRect` when it loads; jsdom does not have it.
SVGSVGElement.prototype.createSVGRect = () => ({}) as DOMRect
