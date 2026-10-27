import { SVG } from 'leaflet'

/** Creates an SVG element with attributes. */
function element<K extends keyof SVGElementTagNameMap>(name: K, attributes: Record<string, string | number>) {
  const node = SVG.create(name)
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value))
  return node
}

/**
 * Adds an opaque ground + grid pattern to the `<defs>` of an SVG, in user space (map units), so the grid moves with
 * the map. One line on the top and left edge of each `cell` px square. Colours come from CSS (classes `<prefix>-ground`,
 * `<prefix>-grid`).
 */
export function addGridPattern(svg: SVGSVGElement, id: string, cell: number, prefix: string): void {
  const pattern = element('pattern', { id, patternUnits: 'userSpaceOnUse', width: cell, height: cell })
  pattern.append(
    element('rect', { class: `${prefix}-ground`, width: cell, height: cell }),
    element('path', { class: `${prefix}-grid`, d: `M0 0.5H${cell}M0.5 0V${cell}` }),
  )
  const defs = element('defs', {})
  defs.append(pattern)
  svg.prepend(defs)
}
