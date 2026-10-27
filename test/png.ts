import { crc32, deflateSync } from 'node:zlib'
import { parseHex } from './color'

/** A 1x1 PNG of one opaque colour (Leaflet stretches it over the 256 px tile): a stub map tile. */
export function solidPng(hex: string): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const out = Buffer.alloc(body.length + 8)
    out.writeUInt32BE(data.length, 0)
    body.copy(out, 4)
    out.writeUInt32BE(crc32(body), body.length + 4)
    return out
  }
  const header = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]) // 1x1, 8 bit, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.from([0, ...parseHex(hex)]))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
