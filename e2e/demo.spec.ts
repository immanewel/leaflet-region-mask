import { expect, test, type Page } from '@playwright/test'
import { contrastRatio, isBlendOf, OSM_LAND, parseHex, type Rgb } from '../test/color'
import { solidPng } from '../test/png'

// The demo page with stub tiles: every tile is one known colour, so painted pixels tell tiles from mask.
// No request leaves localhost.

const LAND = parseHex(OSM_LAND)

// Places (lat, lng) far from the mainland edge at the demo's start view.
const DODOMA = { lat: -6.17, lng: 35.74 } // mainland: tiles
const UNGUJA = { lat: -6.13, lng: 39.36 } // Zanzibar: masked
const KENYA = { lat: -2.5, lng: 38.5 } // neighbour: masked
const SEA = { lat: -8, lng: 41 } // Indian Ocean: masked

declare global {
  interface Window {
    demoMap: import('leaflet').Map
  }
}

async function stubNetwork(page: Page) {
  const tile = solidPng(OSM_LAND)
  await page.route(/^https?:\/\/(?!localhost[:/])/, (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === 'tile.openstreetmap.org') return route.fulfill({ contentType: 'image/png', body: tile })
    return route.abort()
  })
}

/** Holds the region outline response until `release` runs. */
async function holdOutline(page: Page) {
  let release = () => {}
  const held = new Promise<void>((done) => (release = done))
  await page.route('**/tz-mainland.geojson', async (route) => {
    await held
    await route.fallback()
  })
  return release
}

const map = (page: Page) => page.getByRole('region', { name: 'Map of the Tanzania mainland' })

/** Mask in place and tiles loaded. */
async function ready(page: Page) {
  await expect(map(page).locator('path.leaflet-region-mask')).toHaveCount(1)
  await expect(map(page)).not.toHaveClass(/leaflet-region-mask-loading/)
  await expect(map(page).locator('img.leaflet-tile-loaded').first()).toBeAttached()
}

/** Painted pixels of a `size` CSS px square around a place. */
async function pixels(page: Page, at: { lat: number; lng: number }, size: number): Promise<Rgb[]> {
  const point = await page.evaluate(({ lat, lng }) => {
    const p = window.demoMap.latLngToContainerPoint([lat, lng])
    const box = window.demoMap.getContainer().getBoundingClientRect()
    return { x: box.left + p.x, y: box.top + p.y }
  }, at)
  const clip = { x: Math.round(point.x - size / 2), y: Math.round(point.y - size / 2), width: size, height: size }
  const png = await page.screenshot({ clip, scale: 'css', animations: 'disabled' })
  return page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, img.width, img.height).data
    const out: [number, number, number][] = []
    for (let i = 0; i < d.length; i += 4) out.push([d[i]!, d[i + 1]!, d[i + 2]!])
    return out
  }, png.toString('base64'))
}

/** The mask colours as the browser resolves them on the map now (`light-dark()` follows the page scheme). */
async function maskColours(page: Page) {
  return map(page).evaluate((el) => {
    const rgb = (css: string) => (css.match(/\d+/g) ?? []).slice(0, 3).map(Number) as [number, number, number]
    const probe = document.createElement('div')
    el.append(probe)
    const resolve = (name: string) => {
      probe.style.color = `var(${name})`
      return rgb(getComputedStyle(probe).color)
    }
    const colours = { ground: resolve('--region-mask-ground'), grid: resolve('--region-mask-grid') }
    probe.remove()
    const path = el.querySelector('path.leaflet-region-mask')
    return { ...colours, edge: path ? rgb(getComputedStyle(path).stroke) : null }
  })
}

const near = (a: Rgb, b: Rgb, tolerance = 2) => [0, 1, 2].every((i) => Math.abs(a[i]! - b[i]!) <= tolerance)

/** Only ground and grid colours (and their antialiased mix) are painted, and both show. */
function expectOnlyMask(px: Rgb[], c: { ground: Rgb; grid: Rgb }, where: string, both = true) {
  expect(
    px.filter((p) => !isBlendOf(p, c.ground, c.grid, 4)),
    `${where}: only the mask`,
  ).toEqual([])
  if (!both) return
  expect(
    px.some((p) => near(p, c.ground)),
    `${where}: ground visible`,
  ).toBe(true)
  expect(
    px.some((p) => near(p, c.grid)),
    `${where}: grid line visible`,
  ).toBe(true)
}

/** The stub tile colour is painted at the place (polls: tiles fade in). */
async function expectTiles(page: Page, at: { lat: number; lng: number }, where: string) {
  await expect
    .poll(async () => (await pixels(page, at, 9)).every((p) => near(p, LAND)), { message: `${where}: tiles show` })
    .toBe(true)
}

test.beforeEach(async ({ page }) => {
  await stubNetwork(page)
})

test('outside the region: ground + grid; inside: tiles; edge >= 3:1 to both sides (light + dark)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await ready(page)
  const toggle = page.getByRole('button', { name: 'Dark theme' })
  const seen: Rgb[] = []

  for (const scheme of ['light', 'dark'] as const) {
    if (scheme === 'dark') await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', String(scheme === 'dark'))
    const c = await maskColours(page)
    seen.push(c.ground)

    expectOnlyMask(await pixels(page, KENYA, 40), c, `${scheme} Kenya`)
    expectOnlyMask(await pixels(page, SEA, 40), c, `${scheme} sea`)
    expectOnlyMask(await pixels(page, UNGUJA, 5), c, `${scheme} Zanzibar`, false)

    await expectTiles(page, DODOMA, `${scheme} mainland`)

    expect(contrastRatio(c.edge!, c.ground), `${scheme}: edge vs ground`).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(c.edge!, LAND), `${scheme}: edge vs tiles`).toBeGreaterThanOrEqual(3)
  }
  expect(near(seen[0]!, seen[1]!, 20), 'dark ground differs from light ground').toBe(false)
})

test('no flash of world tiles: until the outline loads the map shows only ground + grid', async ({ page }) => {
  const release = await holdOutline(page)
  await page.goto('/')
  await expect(map(page).locator('img.leaflet-tile-loaded').first()).toBeAttached()
  await expect(map(page)).toHaveClass(/leaflet-region-mask-loading/)
  const c = await maskColours(page)
  expectOnlyMask(await pixels(page, DODOMA, 40), c, 'mainland before ready')
  expectOnlyMask(await pixels(page, KENYA, 40), c, 'Kenya before ready')

  release()
  await ready(page)
  await expectTiles(page, DODOMA, 'mainland after ready')
})

test('outline fails to load: tiles show everywhere', async ({ page }) => {
  await page.route('**/tz-mainland.geojson', (route) => route.fulfill({ status: 404 }))
  await page.goto('/')
  await expect(map(page)).not.toHaveClass(/leaflet-region-mask-loading/)
  await expect(map(page).locator('img.leaflet-tile-loaded').first()).toBeAttached()
  await expect(map(page).locator('path.leaflet-region-mask')).toHaveCount(0)
  await expectTiles(page, DODOMA, 'mainland')
  await expectTiles(page, KENYA, 'Kenya')
})
