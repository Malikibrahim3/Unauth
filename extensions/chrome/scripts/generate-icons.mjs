/**
 * Generates simple brand-coloured PNG icons (no external deps).
 * Background: #14100e, accent: #c8763a, letter U in white.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, '../icons');

const BG = [0x14, 0x10, 0x0e];
const ACCENT = [0xc8, 0x76, 0x3a];
const WHITE = [0xff, 0xff, 0xff];

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function createPng(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const margin = Math.floor(size * 0.12);
  const barW = Math.max(2, Math.floor(size * 0.14));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const inRounded =
        x >= margin &&
        x < size - margin &&
        y >= margin &&
        y < size - margin;

      if (!inRounded) {
        pixels[i] = BG[0];
        pixels[i + 1] = BG[1];
        pixels[i + 2] = BG[2];
        pixels[i + 3] = 255;
        continue;
      }

      const relX = x - margin;
      const relY = y - margin;
      const inner = size - margin * 2;
      const isU =
        relX < barW ||
        relX >= inner - barW ||
        (relY >= inner - barW && relX < inner);

      if (isU) {
        pixels[i] = WHITE[0];
        pixels[i + 1] = WHITE[1];
        pixels[i + 2] = WHITE[2];
      } else {
        pixels[i] = ACCENT[0];
        pixels[i + 1] = ACCENT[1];
        pixels[i + 2] = ACCENT[2];
      }
      pixels[i + 3] = 255;
    }
  }

  const raw = Buffer.alloc(size * (1 + size * 4));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      raw[offset++] = pixels[i];
      raw[offset++] = pixels[i + 1];
      raw[offset++] = pixels[i + 2];
      raw[offset++] = pixels[i + 3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw, { level: 9 });
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(iconsDir, { recursive: true });
for (const size of [16, 48, 128]) {
  const png = createPng(size);
  const path = resolve(iconsDir, `icon${size}.png`);
  writeFileSync(path, png);
  console.log(`Wrote ${path} (${png.length} bytes, sha256=${createHash('sha256').update(png).digest('hex').slice(0, 8)}…)`);
}
