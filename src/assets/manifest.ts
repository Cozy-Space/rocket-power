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
} as const;

export type AssetKey = (typeof AssetKeys)[keyof typeof AssetKeys];

export type ImageEntry =
  { key: AssetKey; source: 'generated' } | { key: AssetKey; source: 'file'; path: string };

export interface TilemapEntry {
  key: AssetKey;
  path: string;
}

export const imageManifest: ImageEntry[] = [
  { key: AssetKeys.Rocket, source: 'generated' },
  { key: AssetKeys.Flame, source: 'generated' },
  { key: AssetKeys.CaveTiles, source: 'generated' },
];

export const tilemapManifest: TilemapEntry[] = [
  { key: AssetKeys.Level1, path: 'assets/levels/level-01.json' },
];

/** Tileset name used inside the Tiled map JSON. */
export const TILESET_NAME = 'cave';
