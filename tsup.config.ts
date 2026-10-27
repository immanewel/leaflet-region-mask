import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/region-mask.css'],
  format: ['esm', 'cjs'],
  dts: { entry: 'src/index.ts' },
  external: ['leaflet'],
  target: 'es2020',
  clean: true,
})
