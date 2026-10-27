// Size check: the bundle (JS + CSS), minified and gzipped, must stay under the limit.
import { build } from 'esbuild'
import { basename } from 'node:path'
import { gzipSync } from 'node:zlib'

const LIMIT = 3 * 1024

const { outputFiles } = await build({
  entryPoints: ['src/index.ts', 'src/region-mask.css'],
  bundle: true,
  minify: true,
  format: 'esm',
  external: ['leaflet'],
  outdir: 'out',
  write: false,
})
const sizes = outputFiles.map((file) => [basename(file.path), gzipSync(file.contents).length])
const total = sizes.reduce((sum, [, size]) => sum + size, 0)
for (const [name, size] of sizes) console.log(`${name}: ${size} B min+gzip`)
console.log(`total: ${total} B of ${LIMIT} B`)
if (total >= LIMIT) {
  console.error('Bundle is over the size limit.')
  process.exit(1)
}
