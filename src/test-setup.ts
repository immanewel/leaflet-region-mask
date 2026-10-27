// Leaflet checks SVG support with `createSVGRect` when it loads; jsdom does not have it.
if (typeof SVGSVGElement !== 'undefined') SVGSVGElement.prototype.createSVGRect = () => ({}) as DOMRect
