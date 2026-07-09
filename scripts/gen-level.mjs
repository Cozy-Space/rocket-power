#!/usr/bin/env node
/**
 * Bootstrap level generator: converts the ASCII maps below into
 * Tiled-compatible JSON maps (public/assets/levels/level-NN.json) and writes
 * the tileset image (public/assets/tiles/cave-tiles.png) so the levels open
 * in Tiled without warnings.
 *
 * Legend:  # rock   = landing pad surface   . air   S player spawn
 *          ◣ ◢ ◤ ◥ triangle rock (solid corner where the glyph is solid)
 * Each ASCII cell becomes a 2x2 block of 64px tiles; triangle cells expand
 * into one full tile, one air tile and two triangle tiles along the diagonal.
 *
 * Usage: node scripts/gen-level.mjs [levelNumber]
 * Without an argument ALL levels are regenerated — careful: once a level has
 * been edited in Tiled, its JSON is the source of truth; regenerating
 * overwrites it. Pass a level number to write only that one.
 */
import { deflateSync } from 'node:zlib';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LEVELS = [
  {
    file: 'level-01.json',
    ascii: [
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
    ],
  },
  {
    // Narrow serpentine: every corridor ends in a wall or floor, so momentum
    // must be managed — brake before the drop shafts, crawl the tight turns.
    file: 'level-02.json',
    ascii: [
      '##############################',
      '#...........................##',
      '#.S.........................##',
      '#....#####################..##',
      '#....#####################..##',
      '##########################..##',
      '##########################..##',
      '##..........................##',
      '##..........................##',
      '##..##########################',
      '##..##########################',
      '##..##########################',
      '##..################........##',
      '##..........................##',
      '##..........................##',
      '######################======##',
      '##############################',
    ],
  },
  {
    // level-03 was reshaped in Tiled; its JSON is the source of truth and it
    // is intentionally absent here.
    // Plateau: open cavern warm-up — clear two floating slabs, then set down
    // on a raised mesa. Slabs taper to diamond points and the mesa has sloped
    // shoulders (triangle tiles), so near-misses stay near-misses.
    file: 'level-04.json',
    ascii: [
      '##############################',
      '#............................#',
      '#.S..........................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#......◢###◣.................#',
      '#......◥###◤.................#',
      '#............................#',
      '#.............◢###◣..........#',
      '#.............◥###◤..===.....#',
      '#...................◢#####◣..#',
      '#...................#######..#',
      '#...................#######..#',
      '#...................#######..#',
      '#...................#######..#',
      '##############################',
    ],
  },
  {
    // Overhang: hop the pillar, drop through the slot, then slide sideways
    // under the ceiling shelf — the pad is unreachable from straight above.
    file: 'level-05.json',
    ascii: [
      '##############################',
      '#....................#########',
      '#.S..................#########',
      '#....................#########',
      '#....................#########',
      '#....................#########',
      '#....................#########',
      '#.........###........#########',
      '#.........###........#########',
      '#.........###................#',
      '#.........###................#',
      '#.........###..........===...#',
      '#.........###.....############',
      '#.........###.....############',
      '#.........###.....############',
      '#.........###.....############',
      '##############################',
    ],
  },
  {
    // Twin Shafts: only the left shaft reaches the bottom gallery; the middle
    // one is a dead-end decoy. The pad sits sunk into the gallery floor.
    file: 'level-06.json',
    ascii: [
      '##############################',
      '#..........###################',
      '#.S........###################',
      '#..........##.......##########',
      '#..........##.......##########',
      '####..#######.......##########',
      '####..#########..#############',
      '####..#########..#############',
      '####..#########..#############',
      '####..#########..#############',
      '####..#########..#############',
      '####........................##',
      '####........................##',
      '####........................##',
      '#######################===####',
      '##############################',
      '##############################',
    ],
  },
  {
    // Serpentine II: like level 2 but the galleries connect through single
    // 128px drop-holes — brake fully, line up, and feed the rocket through.
    file: 'level-07.json',
    ascii: [
      '##############################',
      '#..........................###',
      '#.S........................###',
      '#..........................###',
      '##########################.###',
      '###........................###',
      '###........................###',
      '###........................###',
      '###.##########################',
      '###........................###',
      '###........................###',
      '###........................###',
      '##########################.###',
      '###........................###',
      '###........................###',
      '###..===...................###',
      '##############################',
    ],
  },
  {
    // The Chimney: a 128px-wide flue with a dogleg — pure throttle control,
    // no room to build sideways speed.
    file: 'level-08.json',
    ascii: [
      '##############################',
      '#............................#',
      '#.S..........................#',
      '#............................#',
      '##############.###############',
      '##############.###############',
      '##############.....###########',
      '##############.....###########',
      '##################.###########',
      '##################.###########',
      '##################.###########',
      '##################.###########',
      '###############.........######',
      '###############.........######',
      '#################===##########',
      '##############################',
      '##############################',
    ],
  },
  {
    // Asteroid Field: open cavern littered with floating rocks; any of them
    // ends the run, and the pad is tucked into the far corner.
    file: 'level-09.json',
    ascii: [
      '##############################',
      '#............................#',
      '#.S.......##........###......#',
      '#....##...##........###......#',
      '#....##........##........##..#',
      '#..............##........##..#',
      '#..##...##........##.........#',
      '#..##...##...##...##...##....#',
      '#............##........##....#',
      '#.....##........##........##.#',
      '#.....##...##...##...##...##.#',
      '#..........##........##......#',
      '#.................##.........#',
      '#.........##......##.........#',
      '#............................#',
      '#.......................==...#',
      '##############################',
    ],
  },
  {
    // Zigzag: one tall shaft, four alternating shelves — every ledge demands
    // killing momentum in one direction and rebuilding it in the other.
    file: 'level-10.json',
    ascii: [
      '##############################',
      '##########.....S.......#######',
      '##########.............#######',
      '####################...#######',
      '##########.............#######',
      '##########.............#######',
      '##########...#################',
      '##########.............#######',
      '##########.............#######',
      '####################...#######',
      '##########.............#######',
      '##########.............#######',
      '##########...#################',
      '##########.............#######',
      '##########.............#######',
      '##########.......===...#######',
      '##############################',
    ],
  },
  {
    // Needles: full-width floors with one 256px gap at alternating ends;
    // long cruises that must end at a dead stop above each gap.
    file: 'level-11.json',
    ascii: [
      '##############################',
      '#............................#',
      '#.S..........................#',
      '#............................#',
      '###########################..#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#..###########################',
      '#............................#',
      '#............................#',
      '#............................#',
      '###########################..#',
      '#............................#',
      '#............................#',
      '#....==......................#',
      '##############################',
    ],
  },
  {
    // The Gauntlet: drop the entry shaft, then fly a long low tunnel weaving
    // between stalactites and stalagmites to a pad chamber at the far end.
    file: 'level-12.json',
    ascii: [
      '##############################',
      '#.....########################',
      '#.S...########################',
      '#.....########################',
      '#.....########################',
      '#.....########################',
      '#.....##################.....#',
      '#.....##################.....#',
      '#.....##################.....#',
      '#.....##################.....#',
      '#.......#.....#.....#........#',
      '#.............#..#...........#',
      '#..........#.....#.....#.===.#',
      '##############################',
      '##############################',
      '##############################',
      '##############################',
    ],
  },
  {
    // The Core: finale — 128px chimney into a spiked gallery, a second drop,
    // and a small pad sunk into the floor of the last chamber.
    file: 'level-13.json',
    ascii: [
      '##############################',
      '#........#####################',
      '#.S......#####################',
      '#........#####################',
      '######.#######################',
      '######.#######################',
      '######.#######################',
      '######.#######################',
      '######.#######################',
      '####......#.......#......#####',
      '####..........#..........#####',
      '#######################..#####',
      '#######################..#####',
      '###################.........##',
      '###################.........##',
      '####################==########',
      '##############################',
    ],
  },
  {
    // The Chute: a long 45° slide walled entirely by triangle tiles — hug the
    // diagonal down to a low gallery, duck the hanging block, take the pad.
    file: 'level-14.json',
    ascii: [
      '##############################',
      '#.S...◥#######################',
      '#......◥######################',
      '#◣......◥#####################',
      '##◣......◥####################',
      '###◣......◥###################',
      '####◣......◥##################',
      '#####◣......◥#################',
      '######◣......◥################',
      '#######◣......◥###############',
      '########◣......◥##############',
      '#########◣......◥#############',
      '##########◣......◥############',
      '###########◣......◥###########',
      '#############......##........#',
      '#############...........===..#',
      '##############################',
    ],
  },
];

const SCALE = 2;
const TILE = 64;
// Tile gids: 1 rock, 2 pad, 3-6 triangles (solid bottom-left, bottom-right,
// top-left, top-right), 7-21 border rock (rim per exposure mask, N=1 E=2 S=4
// W=8; picked at runtime — levels are authored with plain rock only). Must
// match the tileset image, rules/triangles.ts and rules/borders.ts.
const ROCK = 1;
const PAD = 2;
const TRI = { BL: 3, BR: 4, TL: 5, TR: 6 };
// Each ASCII cell expands to [topLeft, topRight, bottomLeft, bottomRight].
const BLOCKS = {
  '#': [ROCK, ROCK, ROCK, ROCK],
  '=': [PAD, PAD, PAD, PAD],
  '.': [0, 0, 0, 0],
  S: [0, 0, 0, 0],
  '◣': [TRI.BL, 0, ROCK, TRI.BL],
  '◢': [0, TRI.BR, TRI.BR, ROCK],
  '◤': [ROCK, TRI.TL, TRI.TL, 0],
  '◥': [TRI.TR, ROCK, 0, TRI.TR],
};

function buildMap(ascii, name) {
  const rows = ascii.length;
  const cols = ascii[0].length;
  for (const [i, row] of ascii.entries()) {
    if (row.length !== cols)
      throw new Error(`${name} row ${i} has length ${row.length}, expected ${cols}`);
    if (![...row].every((ch) => ch in BLOCKS))
      throw new Error(`${name} row ${i} has unknown characters`);
  }

  const width = cols * SCALE;
  const height = rows * SCALE;

  const data = [];
  let spawnCell = null;
  const padCells = [];
  for (let r = 0; r < rows; r++) {
    for (let s = 0; s < SCALE; s++) {
      for (let c = 0; c < cols; c++) {
        const ch = ascii[r][c];
        if (ch === 'S' && s === 0) spawnCell = { c, r };
        if (ch === '=' && s === 0) padCells.push({ c, r });
        for (let t = 0; t < SCALE; t++) data.push(BLOCKS[ch][s * SCALE + t]);
      }
    }
  }
  if (!spawnCell) throw new Error(`${name} needs exactly one S (spawn)`);
  if (padCells.length === 0) throw new Error(`${name} needs at least one = (landing pad)`);

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

  return { width, height, data, spawn, padRect };
}

function tiledJson({ width, height, data, spawn, padRect }) {
  return {
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
        imagewidth: 1344,
        imageheight: 64,
        columns: 21,
        tilecount: 21,
        tilewidth: TILE,
        tileheight: TILE,
        margin: 0,
        spacing: 0,
      },
    ],
  };
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
  // Triangle tiles 3-6; unpainted pixels stay transparent.
  const solid = [
    (x, y) => y >= x, // bottom-left
    (x, y) => x + y >= 64, // bottom-right
    (x, y) => x + y <= 64, // top-left
    (x, y) => y <= x, // top-right
  ];
  for (const [i, inside] of solid.entries()) {
    const ox = 128 + i * 64;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        if (!inside(x + 0.5, y + 0.5)) continue;
        const nearHyp =
          !inside(x + 4.5, y + 4.5) ||
          !inside(x - 3.5, y + 4.5) ||
          !inside(x + 4.5, y - 3.5) ||
          !inside(x - 3.5, y - 3.5);
        set(ox + x, y, nearHyp ? 0x2d3748 : 0x4a5568);
      }
    }
  }
  // Border-rock tiles 7-21: rock with a rim on each exposed edge (mask 1-15).
  for (let mask = 1; mask <= 15; mask++) {
    const ox = 384 + (mask - 1) * 64;
    fillRect(set, ox, 0, 64, 64, 0x4a5568);
    if (mask & 1) fillRect(set, ox, 0, 64, 4, 0x2d3748); // north
    if (mask & 2) fillRect(set, ox + 60, 0, 4, 64, 0x2d3748); // east
    if (mask & 4) fillRect(set, ox, 60, 64, 4, 0x2d3748); // south
    if (mask & 8) fillRect(set, ox, 0, 4, 64, 0x2d3748); // west
  }
}

// --- write outputs -------------------------------------------------------------
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tilesPath = join(root, 'public/assets/tiles/cave-tiles.png');
const only = process.argv[2] ? Number(process.argv[2]) : null;

for (const level of LEVELS) {
  // Match on the file's own number — the array has gaps (level-03 lives in Tiled).
  if (only !== null && Number(level.file.match(/\d+/)[0]) !== only) continue;
  const built = buildMap(level.ascii, level.file);
  const levelPath = join(root, 'public/assets/levels', level.file);
  mkdirSync(dirname(levelPath), { recursive: true });
  writeFileSync(levelPath, JSON.stringify(tiledJson(built)));
  console.log(`Wrote ${levelPath} (${built.width}x${built.height} tiles)`);
  console.log(
    `  Spawn: (${built.spawn.x}, ${built.spawn.y})  Pad: ${JSON.stringify(built.padRect)}`,
  );
}

// Bootstrap only: the shipped tileset is custom art, never overwrite it.
if (!existsSync(tilesPath)) {
  mkdirSync(dirname(tilesPath), { recursive: true });
  writePng(tilesPath, 1344, 64, paintTiles);
  console.log(`Wrote ${tilesPath}`);
}
