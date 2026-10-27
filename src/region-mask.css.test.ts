// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio, OSM_LAND } from '../test/color'

const css = readFileSync(new URL('./region-mask.css', import.meta.url), 'utf8')

/** Default of a `--region-mask-*` variable as [light, dark] hex colours, from `light-dark(#light, #dark)`. */
function defaults(name: string): [string, string] {
  const m = new RegExp(String.raw`--region-mask-${name}:\s*light-dark\((#[0-9a-f]+),\s*(#[0-9a-f]+)\)`, 'i').exec(css)
  if (!m?.[1] || !m[2]) throw new Error(`No light-dark default for --region-mask-${name}`)
  return [m[1], m[2]]
}

describe('region-mask.css defaults', () => {
  it.each([
    ['light', 0],
    ['dark', 1],
  ] as const)('%s: edge has >= 3:1 contrast to the ground and to the tiles', (_name, scheme) => {
    const edge = defaults('edge')[scheme]
    expect(contrastRatio(edge, defaults('ground')[scheme])).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(edge, OSM_LAND)).toBeGreaterThanOrEqual(3)
  })
})
