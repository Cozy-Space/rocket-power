/**
 * Auto-tiling for rock borders: rock tiles with air on any side swap to a
 * border variant with a rim along each exposed edge (same rim as the triangle
 * hypotenuses). Levels are authored with plain rock only; GameScene applies
 * this at load time.
 */

export const AIR = 0;
export const ROCK = 1;

/** Exposure bitmask bits, one per tile edge. */
export const EXPOSED_N = 1;
export const EXPOSED_E = 2;
export const EXPOSED_S = 4;
export const EXPOSED_W = 8;

/** First border-rock gid; mask m (1-15) lives at BORDER_FIRST_GID + m - 1. */
export const BORDER_FIRST_GID = 7;
export const BORDER_LAST_GID = BORDER_FIRST_GID + 14;

/** Reads the gid at a tile coordinate; return AIR (or -1) for empty. */
export type GidAt = (x: number, y: number) => number;

type Dir = 'n' | 'e' | 's' | 'w';

/**
 * Whether a neighbor gid fully covers the edge it shares with the tile it
 * neighbors in direction `dir`. Triangles cover only their two solid edges:
 * e.g. the north neighbor shares its bottom edge, which only bottom-left (3)
 * and bottom-right (4) triangles fill.
 */
function coversEdge(neighborGid: number, dir: Dir): boolean {
  if (neighborGid <= AIR) return false;
  switch (neighborGid) {
    case 3: // bottom-left: solid left + bottom edge
      return dir === 'n' || dir === 'e';
    case 4: // bottom-right: solid right + bottom edge
      return dir === 'n' || dir === 'w';
    case 5: // top-left: solid left + top edge
      return dir === 's' || dir === 'e';
    case 6: // top-right: solid right + top edge
      return dir === 's' || dir === 'w';
    default: // rock, pad, bordered rock
      return true;
  }
}

/** Which edges of the tile at (x, y) face air. */
export function exposureMask(gidAt: GidAt, x: number, y: number): number {
  let mask = 0;
  if (!coversEdge(gidAt(x, y - 1), 'n')) mask |= EXPOSED_N;
  if (!coversEdge(gidAt(x + 1, y), 'e')) mask |= EXPOSED_E;
  if (!coversEdge(gidAt(x, y + 1), 's')) mask |= EXPOSED_S;
  if (!coversEdge(gidAt(x - 1, y), 'w')) mask |= EXPOSED_W;
  return mask;
}

/** The gid a rock tile should render as, given its exposure mask. */
export function borderedGid(mask: number): number {
  return mask === 0 ? ROCK : BORDER_FIRST_GID + mask - 1;
}
