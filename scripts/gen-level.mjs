#!/usr/bin/env node
/**
 * Bootstrap level generator: converts the ASCII map below into a
 * Tiled-compatible JSON map (public/assets/levels/level-01.json) and writes
 * the tileset image (public/assets/tiles/cave-tiles.png) so the level opens
 * in Tiled without warnings.
 *
 * Legend:  # rock   = landing pad surface   . air   S player spawn
 * Each ASCII cell becomes a 2x2 block of 64px tiles.
 *
 * This script is only needed to (re)bootstrap a level. Once you edit
 * level-01.json in Tiled, the JSON file is the source of truth.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ASCII_MAP = [
  '##############################',
  '#............#####...........#',
  '#.S..........#####...........#',
  '#............#####...........#',
  '#............#####...........#',
  '#............#####...........#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#...................####.....#',
  '#...................####.....#',
  '#########...........####.....#',
  '#########...........####.....#',
  '#########...........####.....#',
  '#########...........####.....#',
  '#########...........####====.#',
  '##############################',
];

const SCALE = 2;
const TILE = 64;
const GID = { '#': 1, '=': 2, '.': 0, S: 0 };

const rows = ASCII_MAP.length;
const cols = ASCII_MAP[0].length;
for (const [i, row] of ASCII_MAP.entries()) {
  if (row.length !== cols) throw new Error(`Row ${i} has length ${row.length}, expected ${cols}`);
  if (![...row].every((ch) => ch in GID)) throw new Error(`Row ${i} has unknown characters`);
}

const width = cols * SCALE;
const height = rows * SCALE;

// --- tile layer data ---------------------------------------------------------
const data = [];
let spawnCell = null;
const padCells = [];
for (let r = 0; r < rows; r++) {
  for (let s = 0; s < SCALE; s++) {
    for (let c = 0; c < cols; c++) {
      const ch = ASCII_MAP[r][c];
      if (ch === 'S' && s === 0) spawnCell = { c, r };
      if (ch === '=' && s === 0) padCells.push({ c, r });
      for (let t = 0; t < SCALE; t++) data.push(GID[ch]);
    }
  }
}
if (!spawnCell) throw new Error('Map needs exactly one S (spawn)');
if (padCells.length === 0) throw new Error('Map needs at least one = (landing pad)');

// --- markers -----------------------------------------------------------------
const spawn = {
  x: (spawnCell.c * SCALE + 1) * TILE,
  y: (spawnCell.r * SCALE + 1) * TILE,
};
const padMinC = Math.min(...padCells.map((p) => p.c));
const padMaxC = Math.max(...padCells.map((p) => p.c));
const padTopR = Math.min(...padCells.map((p) => p.r));
// Thin evaluation band across the pad's top face; the rocket's bottom-center
// must be inside it at the moment of touchdown.
const padRect = {
  x: padMinC * SCALE * TILE,
  y: padTopR * SCALE * TILE - 32,
  width: (padMaxC - padMinC + 1) * SCALE * TILE,
  height: 40,
};

const map = {
  compressionlevel: -1,
  type: 'map',
  version: '1.10',
  tiledversion: '1.10.2',
  orientation: 'orthogonal',
  renderorder: 'right-down',
  infinite: false,
  width,
  height,
  tilewidth: TILE,
  tileheight: TILE,
  nextlayerid: 3,
  nextobjectid: 3,
  layers: [
    {
      id: 1,
      name: 'terrain',
      type: 'tilelayer',
      width,
      height,
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      data,
    },
    {
      id: 2,
      name: 'markers',
      type: 'objectgroup',
      draworder: 'topdown',
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      objects: [
        {
          id: 1,
          name: 'spawn',
          type: '',
          point: true,
          rotation: 0,
          visible: true,
          x: spawn.x,
          y: spawn.y,
          width: 0,
          height: 0,
        },
        {
          id: 2,
          name: 'landing-pad',
          type: '',
          rotation: 0,
          visible: true,
          ...padRect,
        },
      ],
    },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: 'cave',
      image: '../tiles/cave-tiles.png',
      imagewidth: 128,
      imageheight: 64,
      columns: 2,
      tilecount: 2,
      tilewidth: TILE,
      tileheight: TILE,
      margin: 0,
      spacing: 0,
    },
  ],
};

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

function fillRect(set, x0, y0, w, h, rgb) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, rgb);
}

// Mirrors the placeholder tiles drawn in BootScene.generateCaveTiles.
function paintTiles(set) {
  fillRect(set, 0, 0, 64, 64, 0x4a5568);
  fillRect(set, 0, 0, 64, 4, 0x2d3748);
  fillRect(set, 0, 60, 64, 4, 0x2d3748);
  fillRect(set, 0, 0, 4, 64, 0x2d3748);
  fillRect(set, 60, 0, 4, 64, 0x2d3748);
  fillRect(set, 14, 16, 10, 10, 0x5d6b81);
  fillRect(set, 38, 36, 12, 8, 0x5d6b81);
  fillRect(set, 64, 0, 64, 64, 0x2d3748);
  fillRect(set, 64, 0, 64, 10, 0x48bb78);
  fillRect(set, 72, 14, 12, 6, 0xf6e05e);
  fillRect(set, 108, 14, 12, 6, 0xf6e05e);
}

// --- write outputs -------------------------------------------------------------
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const levelPath = join(root, 'public/assets/levels/level-01.json');
const tilesPath = join(root, 'public/assets/tiles/cave-tiles.png');
mkdirSync(dirname(levelPath), { recursive: true });
mkdirSync(dirname(tilesPath), { recursive: true });
writeFileSync(levelPath, JSON.stringify(map));
writePng(tilesPath, 128, 64, paintTiles);

console.log(`Wrote ${levelPath} (${width}x${height} tiles)`);
console.log(`Wrote ${tilesPath}`);
console.log(`Spawn: (${spawn.x}, ${spawn.y})  Pad: ${JSON.stringify(padRect)}`);
