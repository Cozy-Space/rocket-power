/**
 * Single source of truth for asset keys and where they come from.
 *
 * Swapping placeholder art for real art happens ONLY here: change an entry's
 * source from 'generated' to 'file' and point `path` at a file under public/.
 * BootScene draws 'generated' entries, PreloadScene loads 'file' entries.
 */
export const AssetKeys = {
  Rocket: 'rocket',
  Flame: 'flame',
  CaveTiles: 'cave-tiles',
  Level1: 'level-01',
  Level2: 'level-02',
  Level3: 'level-03',
  Level4: 'level-04',
  Level5: 'level-05',
  Level6: 'level-06',
  Level7: 'level-07',
  Level8: 'level-08',
  Level9: 'level-09',
  Level10: 'level-10',
  Level11: 'level-11',
  Level12: 'level-12',
  Level13: 'level-13',
  Level14: 'level-14',
} as const;

export type AssetKey = (typeof AssetKeys)[keyof typeof AssetKeys];

export type ImageEntry =
  { key: AssetKey; source: 'generated' } | { key: AssetKey; source: 'file'; path: string };

export interface TilemapEntry {
  key: AssetKey;
  path: string;
}

export const imageManifest: ImageEntry[] = [
  { key: AssetKeys.Rocket, source: 'file', path: 'assets/sprites/rocket.png' },
  { key: AssetKeys.Flame, source: 'file', path: 'assets/sprites/flame.png' },
  { key: AssetKeys.CaveTiles, source: 'file', path: 'assets/tiles/cave-tiles.png' },
];

export const tilemapManifest: TilemapEntry[] = [
  { key: AssetKeys.Level1, path: 'assets/levels/level-01.json' },
  { key: AssetKeys.Level2, path: 'assets/levels/level-02.json' },
  { key: AssetKeys.Level3, path: 'assets/levels/level-03.json' },
  { key: AssetKeys.Level4, path: 'assets/levels/level-04.json' },
  { key: AssetKeys.Level5, path: 'assets/levels/level-05.json' },
  { key: AssetKeys.Level6, path: 'assets/levels/level-06.json' },
  { key: AssetKeys.Level7, path: 'assets/levels/level-07.json' },
  { key: AssetKeys.Level8, path: 'assets/levels/level-08.json' },
  { key: AssetKeys.Level9, path: 'assets/levels/level-09.json' },
  { key: AssetKeys.Level10, path: 'assets/levels/level-10.json' },
  { key: AssetKeys.Level11, path: 'assets/levels/level-11.json' },
  { key: AssetKeys.Level12, path: 'assets/levels/level-12.json' },
  { key: AssetKeys.Level13, path: 'assets/levels/level-13.json' },
  { key: AssetKeys.Level14, path: 'assets/levels/level-14.json' },
];

/** Tileset name used inside the Tiled map JSON. */
export const TILESET_NAME = 'cave';
