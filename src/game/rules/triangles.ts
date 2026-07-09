/** Which corner of the tile the solid right angle sits in. */
export type TriangleKind = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

/**
 * Tile gids of the triangle tiles in the 'cave' tileset (see
 * scripts/gen-level.mjs). Everything else in the terrain layer is a full
 * square.
 */
export const TRIANGLE_TILES: Readonly<Record<number, TriangleKind>> = {
  3: 'bottom-left',
  4: 'bottom-right',
  5: 'top-left',
  6: 'top-right',
};

/** Axis-aligned rect in tile-local pixels (origin = tile top-left, y down). */
export interface LocalRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * True if the rect overlaps the solid half of a triangle tile. Arcade physics
 * only collides AABBs, so this decides whether an AABB-vs-tile contact
 * actually touched terrain or just the empty half of the tile. Grazing the
 * hypotenuse exactly does not count — flying flush along a slope is safe.
 */
export function rectOverlapsTriangle(
  kind: TriangleKind,
  rect: LocalRect,
  tileSize: number,
): boolean {
  const left = Math.max(rect.left, 0);
  const right = Math.min(rect.right, tileSize);
  const top = Math.max(rect.top, 0);
  const bottom = Math.min(rect.bottom, tileSize);
  if (left >= right || top >= bottom) {
    return false;
  }

  // Each solid half is a linear half-plane, so it suffices to test the rect
  // corner that reaches deepest into it.
  switch (kind) {
    case 'bottom-left': // solid where y >= x
      return bottom > left;
    case 'bottom-right': // solid where x + y >= tileSize
      return right + bottom > tileSize;
    case 'top-left': // solid where x + y <= tileSize
      return left + top < tileSize;
    case 'top-right': // solid where y <= x
      return top < right;
  }
}
