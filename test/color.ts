/** sRGB colour as 0..255 channels. */
export type Rgb = readonly [number, number, number]

/** `#rrggbb` or `#rgb` -> [r, g, b] (0..255). Throws on any other text. */
export function parseHex(hex: string): Rgb {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m?.[1]) throw new Error(`Not a hex colour: ${hex}`)
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as unknown as Rgb
}

function luminance(colour: Rgb | string): number {
  const [r = 0, g = 0, b = 0] = (typeof colour === 'string' ? parseHex(colour) : colour).map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.x contrast ratio of two opaque colours (1..21). */
export function contrastRatio(a: Rgb | string, b: Rgb | string): number {
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** OpenStreetMap land colour: the map detail next to the region edge (the plugin does not change tiles). */
export const OSM_LAND = '#f2efe9'
