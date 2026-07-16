#!/usr/bin/env node
/**
 * Bootstrap level generator: converts the ASCII maps below into
 * Tiled-compatible JSON maps (public/assets/levels/level-NN.json). The
 * tileset image the maps reference is painted by scripts/gen-tiles.mjs.
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
import { mkdirSync, writeFileSync } from 'node:fs';
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
// top-left, top-right; picked at runtime — levels are authored with plain
// rock only). Must match the tileset image and rules/triangles.ts.
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
        imagewidth: 384,
        imageheight: 64,
        columns: 6,
        tilecount: 6,
        tilewidth: TILE,
        tileheight: TILE,
        margin: 0,
        spacing: 0,
      },
    ],
  };
}

// --- write outputs -------------------------------------------------------------
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
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
