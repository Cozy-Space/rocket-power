#!/usr/bin/env node
/**
 * Paints the cave tileset (public/assets/tiles/cave-tiles.png).
 * Six 64px tiles, gids 1-6: rock, landing pad, triangle rock (solid
 * bottom-left, bottom-right, top-left, top-right). Order must match
 * scripts/gen-level.mjs and src/game/rules/triangles.ts.
 *
 * Palette is keyed to the game background (#0b0e14) and the mint terrain
 * glow (0x66ffcc) added in GameScene: cool slate rock, amber pad accents.
 *
 * Usage: node scripts/gen-tiles.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TILE = 64;

// --- palette ---------------------------------------------------------------
const ROCK_DARK = 0x161c28;
const ROCK_LIGHT = 0x202836;
const PAD_EDGE = 0xffe6a3;
const CHEVRON_ON = 0xf2b13e;
const CHEVRON_OFF = 0x2a3040;
const PAD_LIGHT = 0x66ffcc;
const PAD_LIGHT_HOUSING = 0x10141d;

// --- seamless value noise (wraps at 64px so tiles butt invisibly) -----------
function hash(ix, iy) {
  let h = (ix * 374761393 + iy * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
}

function noise(x, y, cell) {
  const cells = TILE / cell;
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = (x % cell) / cell;
  const fy = (y % cell) / cell;
  const v = (ix, iy) => hash(ix % cells, iy % cells);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = v(gx, gy) + (v(gx + 1, gy) - v(gx, gy)) * sx;
  const bot = v(gx, gy + 1) + (v(gx + 1, gy + 1) - v(gx, gy + 1)) * sx;
  return top + (bot - top) * sy;
}

function lerpColor(a, b, t) {
  const ch = (shift) => {
    const ca = (a >> shift) & 0xff;
    const cb = (b >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * t) << shift;
  };
  return ch(16) | ch(8) | ch(0);
}

/** Blotchy slate — two octaves of wrapped value noise. */
function rockColor(x, y) {
  const n = 0.7 * noise(x, y, 32) + 0.3 * noise(x, y, 16);
  return lerpColor(ROCK_DARK, ROCK_LIGHT, n);
}

function padColor(x, y) {
  if (y < 3) return PAD_EDGE;
  if (y < 14) return (((x - y) % 16) + 16) % 16 < 8 ? CHEVRON_ON : CHEVRON_OFF;
  // recessed landing lights, one per 32px so multi-tile pads read as a strip
  const inLight = y >= 20 && y < 25 && (x % 32 >= 13 && x % 32 < 19);
  if (inLight) return PAD_LIGHT;
  const inHousing = y >= 18 && y < 27 && (x % 32 >= 11 && x % 32 < 21);
  if (inHousing) return PAD_LIGHT_HOUSING;
  // Body matches the rock so pads sit flush in the terrain.
  return rockColor(x, y);
}

function paintTiles(set) {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      set(x, y, rockColor(x, y));
      set(TILE + x, y, padColor(x, y));
    }
  }
  // Triangle tiles 3-6; unpainted pixels stay transparent.
  const solid = [
    (x, y) => y >= x, // bottom-left
    (x, y) => x + y >= TILE, // bottom-right
    (x, y) => x + y <= TILE, // top-left
    (x, y) => y <= x, // top-right
  ];
  for (const [i, inside] of solid.entries()) {
    const ox = (2 + i) * TILE;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        if (inside(x + 0.5, y + 0.5)) set(ox + x, y, rockColor(x, y));
      }
    }
  }
}

// --- minimal PNG writer (RGBA, no filters) -----------------------------------
function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, payload) {
  const chunk = Buffer.concat([Buffer.from(type, 'ascii'), payload]);
  const out = Buffer.alloc(chunk.length + 8);
  out.writeUInt32BE(payload.length, 0);
  chunk.copy(out, 4);
  out.writeUInt32BE(crc32(chunk), chunk.length + 4);
  return out;
}

function writePng(path, w, h, paint) {
  const pixels = Buffer.alloc(w * h * 4);
  paint((x, y, rgb) => {
    const i = (y * w + x) * 4;
    pixels[i] = (rgb >> 16) & 0xff;
    pixels[i + 1] = (rgb >> 8) & 0xff;
    pixels[i + 2] = rgb & 0xff;
    pixels[i + 3] = 0xff;
  });
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    pixels.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tilesPath = join(root, 'public/assets/tiles/cave-tiles.png');
mkdirSync(dirname(tilesPath), { recursive: true });
writePng(tilesPath, 6 * TILE, TILE, paintTiles);
console.log(`Wrote ${tilesPath}`);
