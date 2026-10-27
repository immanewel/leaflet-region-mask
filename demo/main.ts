import 'leaflet/dist/leaflet.css'
import '../src/region-mask.css'
import { map as createMap, tileLayer } from 'leaflet'
import { regionMask } from '../src'

const map = createMap('map', {
  maxBounds: [
    [-13, 27.5],
    [1, 42.5],
  ],
  maxBoundsViscosity: 1,
  minZoom: 5,
}).fitBounds([
  [-11.75, 29.3],
  [-0.98, 40.45],
])
tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map)
regionMask('./tz-mainland.geojson').addTo(map)

// Light/dark toggle: sets the page colour scheme; the mask follows through light-dark() in its CSS variables.
const button = document.getElementById('theme') as HTMLButtonElement
const root = document.documentElement
const setTheme = (dark: boolean) => {
  root.dataset.theme = dark ? 'dark' : 'light'
  button.setAttribute('aria-pressed', String(dark))
}
setTheme(matchMedia('(prefers-color-scheme: dark)').matches)
button.addEventListener('click', () => setTheme(root.dataset.theme !== 'dark'))

// For the end-to-end tests: place to screen point.
Object.assign(window, { demoMap: map })
