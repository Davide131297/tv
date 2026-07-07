// Generates simple, valid PNG brand assets so the Expo app has real icons.
// Draws a rounded "signal/broadcast" mark on the brand background.
// Run: node tools/gen-assets.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Draw callback receives (x, y) and returns [r, g, b, a]
function makePng(size, draw) {
  const bytesPerRow = size * 4 + 1; // +1 filter byte
  const raw = Buffer.alloc(bytesPerRow * size);
  for (let y = 0; y < size; y++) {
    raw[y * bytesPerRow] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y);
      const off = y * bytesPerRow + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Brand palette
const BG = [11, 18, 32]; // #0B1220
const ACCENT = [56, 189, 248]; // sky-400
const ACCENT2 = [129, 140, 248]; // indigo-400

// A broadcast-style mark: a filled dot with two concentric arcs (signal waves).
function drawMark(transparent) {
  return (size) => (x, y) => {
    const cx = size / 2;
    const cy = size * 0.56;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const t = (v) => v / size;

    const base = transparent ? [0, 0, 0, 0] : [...BG, 255];

    // center dot
    if (dist < size * 0.09) return [...ACCENT, 255];

    // inner wave ring
    const r1 = size * 0.19;
    if (Math.abs(dist - r1) < size * 0.035 && y < cy + size * 0.02) {
      return [...ACCENT, 255];
    }
    // outer wave ring
    const r2 = size * 0.31;
    if (Math.abs(dist - r2) < size * 0.035 && y < cy + size * 0.02) {
      return [...ACCENT2, 255];
    }
    // subtle vertical stand under the dot
    if (Math.abs(dx) < size * 0.03 && y > cy + size * 0.09 && y < cy + size * 0.28) {
      return [...ACCENT, 255];
    }
    return base;
  };
}

const outDir = path.join(__dirname, "..", "assets", "images");
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { name: "icon.png", size: 1024, transparent: false },
  { name: "adaptive-icon.png", size: 1024, transparent: true },
  { name: "splash-icon.png", size: 512, transparent: true },
  { name: "favicon.png", size: 96, transparent: false },
];

for (const { name, size, transparent } of targets) {
  const png = makePng(size, drawMark(transparent)(size));
  fs.writeFileSync(path.join(outDir, name), png);
  console.log(`wrote ${name} (${size}x${size})`);
}
