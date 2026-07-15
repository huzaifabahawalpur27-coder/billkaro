/**
 * Generates the PWA icons (public/icon-192.png, icon-512.png) referenced by
 * public/manifest.json: an indigo rounded square with "BK", written as PNG
 * with no image dependencies (raw RGBA + zlib).
 *
 *   npx tsx scripts/generate-icons.ts
 */
import { deflateSync } from "zlib";
import { writeFileSync } from "fs";
import { join } from "path";

// 5x7 bitmap glyphs
const GLYPHS: Record<string, string[]> = {
  B: ["1111.", "1...1", "1...1", "1111.", "1...1", "1...1", "1111."],
  K: ["1...1", "1..1.", "1.1..", "11...", "1.1..", "1..1.", "1...1"],
};

const INDIGO = [79, 70, 229, 255]; // #4f46e5 (manifest theme_color)
const WHITE = [255, 255, 255, 255];

function crc32(buf: Buffer): number {
  let table = crc32.table as number[] | undefined;
  if (!table) {
    table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    (crc32 as { table?: number[] }).table = table;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
crc32.table = undefined as number[] | undefined;

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size: number, pixels: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // scanlines with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function renderIcon(size: number): Buffer {
  const px = Buffer.alloc(size * size * 4); // transparent
  const radius = Math.round(size * 0.18);

  const inRoundedSquare = (x: number, y: number) => {
    const cx = x < radius ? radius : x >= size - radius ? size - radius - 1 : x;
    const cy = y < radius ? radius : y >= size - radius ? size - radius - 1 : y;
    if (cx === x && cy === y) return true;
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= radius * radius;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inRoundedSquare(x, y)) px.set(INDIGO, (y * size + x) * 4);
    }
  }

  // "BK" centered: two 5x7 glyphs with a 1-cell gap = 11x7 cells
  const cell = Math.floor(size / 18);
  const textW = 11 * cell;
  const textH = 7 * cell;
  const ox = Math.round((size - textW) / 2);
  const oy = Math.round((size - textH) / 2);
  const letters = ["B", "K"];
  letters.forEach((letter, li) => {
    const glyph = GLYPHS[letter];
    const gx = ox + li * 6 * cell;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] !== "1") continue;
        for (let dy = 0; dy < cell; dy++) {
          for (let dx = 0; dx < cell; dx++) {
            const x = gx + col * cell + dx;
            const y = oy + row * cell + dy;
            if (x >= 0 && x < size && y >= 0 && y < size) {
              px.set(WHITE, (y * size + x) * 4);
            }
          }
        }
      }
    }
  });

  return encodePng(size, px);
}

for (const size of [192, 512]) {
  const file = join(__dirname, "..", "public", `icon-${size}.png`);
  writeFileSync(file, renderIcon(size));
  console.log(`wrote public/icon-${size}.png`);
}
