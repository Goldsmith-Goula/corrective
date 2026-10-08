/**
 * Generates the PWA icon PNGs.
 *
 * Written by hand rather than pulling in an image library: the mark is a few
 * rounded bars and a dot, which is cheap to rasterize analytically and keeps
 * the dependency list honest. Run with `npm run icons`.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

/* ------------------------------------------------------------------ colours */

const BG = [21, 16, 13, 255]; // --bg dark
const ACCENT = [255, 182, 143, 255]; // --accent dark

/* ------------------------------------------------------------------ geometry
   The mark in a 24x24 space, matching components/shell/Sidebar.tsx:
   a baseline that steps up once, and a dot where it lands. */

const STROKE = 2.75;
const SEGMENTS = [
  // [x1, y1, x2, y2] in the 24-unit space
  [3.5, 15.5, 10, 15.5], // the old level
  [10, 15.5, 10, 8.5], // the correction
  [10, 8.5, 15.5, 8.5], // the new level
];
const DOT = { x: 19.5, y: 8.5, r: 2.6 };

/** Distance from a point to a line segment. */
function distToSegment(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2)) : 0;
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Signed coverage of the mark at a point in the 24-unit space. */
function inMark(ux, uy) {
  for (const seg of SEGMENTS) {
    if (distToSegment(ux, uy, seg) <= STROKE / 2) return true;
  }
  return Math.hypot(ux - DOT.x, uy - DOT.y) <= DOT.r;
}

/* ------------------------------------------------------------------- raster */

/**
 * @param size   output pixel size
 * @param inset  fraction of the canvas left as padding around the mark
 * @param radius corner radius in pixels, or null for a full-bleed square
 */
function render(size, inset, radius) {
  const px = new Uint8Array(size * size * 4);
  const SS = 3; // 3x3 supersampling is enough for these shapes
  const scale = size * (1 - inset * 2) / 24;
  const offset = size * inset;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgHits = 0;
      let markHits = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS;
          const fy = y + (sy + 0.5) / SS;

          // Rounded-square clip for the non-maskable icon.
          if (radius !== null) {
            const cx = Math.min(Math.max(fx, radius), size - radius);
            const cy = Math.min(Math.max(fy, radius), size - radius);
            if (Math.hypot(fx - cx, fy - cy) > radius) continue;
          }
          bgHits++;

          const ux = (fx - offset) / scale;
          const uy = (fy - offset) / scale;
          if (ux >= 0 && ux <= 24 && uy >= 0 && uy <= 24 && inMark(ux, uy)) {
            markHits++;
          }
        }
      }

      const total = SS * SS;
      const alpha = bgHits / total;
      const mark = markHits / total;
      const i = (y * size + x) * 4;

      // Composite accent over background, then the whole thing over nothing.
      for (let c = 0; c < 3; c++) {
        px[i + c] = Math.round(BG[c] * (1 - mark) + ACCENT[c] * mark);
      }
      px[i + 3] = Math.round(255 * alpha);
    }
  }

  return px;
}

/* ---------------------------------------------------------------- png encode */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // compression, filter, interlace all 0

  // One filter byte (none) per scanline.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(
      raw,
      y * (size * 4 + 1) + 1,
    );
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------- outputs */

mkdirSync(OUT, { recursive: true });

const TARGETS = [
  // name, size, inset, corner radius
  ["icon-192.png", 192, 0.2, 42],
  ["icon-512.png", 512, 0.2, 112],
  // Maskable icons get a much larger safe area: Android crops to a circle.
  ["maskable-512.png", 512, 0.29, null],
];

for (const [name, size, inset, radius] of TARGETS) {
  writeFileSync(join(OUT, name), encodePng(size, render(size, inset, radius)));
  console.log(`wrote icons/${name} (${size}x${size})`);
}
