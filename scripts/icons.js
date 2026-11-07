// Genererer app-ikoner (PNG) uten eksterne avhengigheter.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [11, 31, 58]
const Q = [[255, 255, 255], [200, 16, 46], [30, 80, 160], [245, 190, 0]] // hvit, rød, blå, gul

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, file) {
  const ss = 4 // supersampling
  const raw = Buffer.alloc(size * (size * 3 + 1))
  const cx = size / 2, R = size * 0.3, r = size * 0.1, gap = size * 0.018
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0]
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
        const px = x + (sx + 0.5) / ss - cx, py = y + (sy + 0.5) / ss - cx
        const d = Math.hypot(px, py)
        let c = BG
        if (d <= R && d >= r && Math.abs(px) > gap && Math.abs(py) > gap) {
          c = Q[(py < 0 ? 0 : 2) + ((px < 0) === (py < 0) ? 0 : 1)]
        }
        acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]
      }
      const o = y * (size * 3 + 1) + 1 + x * 3
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(acc[i] / (ss * ss))
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]))
}
png(192, 'public/icon-192.png')
png(512, 'public/icon-512.png')
png(180, 'public/apple-touch-icon.png')
console.log('Ikoner skrevet til public/')
